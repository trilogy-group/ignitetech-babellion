// Reference: javascript_openai and javascript_anthropic blueprints
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { storage } from './storage';
import { decrypt } from './encryption';

interface ProofreadingRequest {
  text: string;
  rules: Array<{ title: string; ruleText: string }>;
  modelIdentifier: string;
  provider: 'openai' | 'anthropic';
}

interface ProofreadingResult {
  rule: string;
  original_text: string;
  suggested_change: string;
  rationale: string;
  status?: 'pending' | 'accepted' | 'rejected';
}

export class ProofreadingService {
  // Models that support reasoning - defined by prefixes that the model identifier starts with
  private readonly reasoningModelPrefixes = ['gpt-5', 'o'];

  private async getApiKey(provider: string): Promise<string> {
    const apiKeyRecord = await storage.getApiKey(provider);
    if (!apiKeyRecord) {
      throw new Error(`${provider} API key not configured`);
    }
    return decrypt(apiKeyRecord.encryptedKey);
  }

  private shouldUseReasoning(modelIdentifier: string): boolean {
    return this.reasoningModelPrefixes.some(prefix => modelIdentifier.startsWith(prefix));
  }

  /**
   * Extract text from OpenAI response structure
   */
  private extractTextFromResponse(response: unknown): string {
    const res = response as Record<string, unknown>;
    if (res.output && Array.isArray(res.output) && res.output.length > 0) {
      // Find the message item (not reasoning or other types)
      const messageItem = (res.output as unknown[]).find((item: unknown) => {
        const it = item as Record<string, unknown>;
        return it.type === 'message';
      }) as Record<string, unknown> | undefined;
      
      if (messageItem && messageItem.content && Array.isArray(messageItem.content) && messageItem.content.length > 0) {
        const contentItem = messageItem.content[0] as Record<string, unknown>;
        if (contentItem.type === 'output_text' && typeof contentItem.text === 'string') {
          return contentItem.text;
        }
      }
    }
    return '';
  }

  /**
   * Parse JSON from LLM response, handling markdown code blocks and extracting results array
   */
  private parseProofreadingResults(responseText: string): ProofreadingResult[] {
    try {
      // Remove markdown code blocks if present
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }

      // Try to parse as JSON
      const parsed = JSON.parse(cleanedText) as unknown;

      // Handle different response formats
      if (Array.isArray(parsed)) {
        // Check if it's a direct array of results
        if (parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
          const firstItem = parsed[0] as Record<string, unknown>;
          // Check if first item has a 'results' property (nested structure: [{results: [...]}])
          if (firstItem.results && Array.isArray(firstItem.results)) {
            return firstItem.results as ProofreadingResult[];
          }
          // Check if first item has the expected structure (direct array: [{rule: ..., ...}])
          if (firstItem.rule || firstItem.original_text !== undefined) {
            return parsed as ProofreadingResult[];
          }
        }
        // If array is empty or doesn't match expected structure, return empty
        return [];
      }

      // Handle object with results property: {results: [...]}
      const parsedObj = parsed as Record<string, unknown>;
      if (parsedObj.results && Array.isArray(parsedObj.results)) {
        return parsedObj.results as ProofreadingResult[];
      }

      // If we can't find results, return empty array
      console.warn('Could not find results array in LLM response:', responseText.substring(0, 200));
      return [];
    } catch (error) {
      console.error('Failed to parse proofreading results:', error);
      console.error('Response text:', responseText.substring(0, 500));
      return [];
    }
  }

  async proofread(request: ProofreadingRequest): Promise<ProofreadingResult[]> {
    const { text, rules, modelIdentifier, provider } = request;

    // Construct system prompt
    const systemPrompt = `You are a linguistic expert in proof reading. 
    You are to proof read the text given against common grammatical and linguistic errors, and the given <rules>. 
    You must output the proofread changes only in the format of {"results": [{"rule": rule-name, "original_text":..., "suggested_change":....., "rationale":...in English...}]}. 
    You must output this in a valid JSON format. If no changes are needed, you must output {"results": [{"rule": "no changes needed", "original_text": "N/A", "suggested_change": "N/A", "rationale": clean evaluation of the text}]}. 
    
    If you are correcting common grammatical or spelling errors, use "grammar" or "spelling" as the rule name.
    If there are foreign language terms use, use multi-lingual lenses to evaluate those parts of the text against grammar and spelling errors.
    If you are removing duplicated text, you MUST include partial text surrounding the duplication to ensure accurate text selection: 
    -For original_text: {partial text before first occurrence}{first_text}{in between text if any}{duplicated_text}{partial text after second occurrence}. Preserve ALL HTML formatting exactly as it appears.
    -For suggested_change: {partial text before first occurrence}{corrected text resolving any in between text if any}{partial text after second occurrence}. Preserve ALL HTML formatting exactly as it appears.
    -The goal is to provide enough surrounding text so the editor can uniquely identify and select the exact location of the duplication.
    
    IGNORE:
    - whitespace such <p></p>, these are acceptable whitespace and should not be corrected.
    - ignore not caps for bullets or numbered lists, these are acceptable and should not be corrected.
    `;

    // Construct rules string
    const rulesString = rules.map(rule => `- ${rule.title}: ${rule.ruleText}`).join('\n');

    // Construct user prompt
    const userPrompt = `Proof Read the following <text> with the rules given in <rules>\n\n<rules>\n${rulesString}\n</rules>\n\n<text>\n${text}\n</text>`;

    let results: ProofreadingResult[];
    if (provider === 'openai') {
      results = await this.proofreadWithOpenAI(
        userPrompt,
        systemPrompt,
        modelIdentifier
      );
    } else if (provider === 'anthropic') {
      results = await this.proofreadWithAnthropic(
        userPrompt,
        systemPrompt,
        modelIdentifier
      );
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
    
    // Set initial status to 'pending' for all results
    return results.map(result => ({ ...result, status: 'pending' as const }));
  }

  private async proofreadWithOpenAI(
    userInput: string,
    systemPrompt: string,
    model: string
  ): Promise<ProofreadingResult[]> {
    const apiKey = await this.getApiKey('openai');
    
    // Configure OpenAI client with increased timeout for long-running requests (15 minutes)
    const openai = new OpenAI({ 
      apiKey,
      timeout: 900000, // 15 minutes in milliseconds
      maxRetries: 2,
    });

    // Using responses API: https://platform.openai.com/docs/api-reference/responses/create
    const requestParams: Record<string, unknown> = {
      model,
      input: userInput,
      instructions: systemPrompt,
      max_output_tokens: 50000,
      metadata: {
        app: 'babellion',
        service: 'proofreading',
      },
    };

    // Only add reasoning config for models that support it
    if (this.shouldUseReasoning(model)) {
      requestParams.reasoning = {
        effort: "medium",
        summary: "detailed",
      };
    }

    // Use streaming for real-time updates and to avoid connection timeouts
    const requestStartTime = Date.now();
    
    try {
      console.log(`[AI] Starting OpenAI API request for proofreading, model: ${model}`);
      
      // Create streaming response
      const stream = await openai.responses.create({
        ...requestParams,
        stream: true, // Enable streaming for real-time updates
      } as any) as unknown as AsyncIterable<unknown>;
      
      // Collect all stream events and find the completed response
      let completedResponse: Record<string, unknown> | null = null;
      let responseId: string | undefined;
      
      for await (const event of stream) {
        // Stream events have structure: { type: "response.completed", response: {...}, sequence_number: ... }
        const evt = event as Record<string, unknown>;
        if (evt.response) {
          const resp = evt.response as Record<string, unknown>;
          // Store response ID from the first event with a response
          if (!responseId && typeof resp.id === 'string') {
            responseId = resp.id;
            console.log(`[AI] Streaming response ${responseId}`);
          }
          
          // Check if this is the completed response
          if (evt.type === 'response.completed' && resp.status === 'completed') {
            completedResponse = resp;
            console.log(`[AI] Received response.completed event for ${resp.id}`);
            break; // We got the completed response, no need to continue
          } else if (resp.status === 'failed' || resp.status === 'cancelled') {
            const errorMsg = (resp.error as Record<string, unknown>)?.message as string || 'Unknown error';
            throw new Error(`Response ${resp.id} ${resp.status}: ${errorMsg}`);
          }
          
          // Log progress for other event types
          const elapsed = Math.round((Date.now() - requestStartTime) / 1000);
          const seqNum = evt.sequence_number as number | undefined;
          if (evt.type && seqNum && seqNum % 10 === 0) {
            console.log(`[AI] Received event ${evt.type} (sequence ${seqNum}, ${elapsed}s elapsed)`);
          }
        }
      }
      
      const duration = Math.round((Date.now() - requestStartTime) / 1000);
      
      // Extract text from completed response
      if (completedResponse && completedResponse.output) {
        console.log(`[AI] Stream completed after ${duration}s`);
        const responseText = this.extractTextFromResponse(completedResponse);
        return this.parseProofreadingResults(responseText);
      } else if (!completedResponse) {
        throw new Error(`Stream ended without receiving response.completed event (${duration}s elapsed)`);
      } else {
        throw new Error(`Response completed but no output found in response`);
      }
    } catch (error: unknown) {
      const requestDuration = Math.round((Date.now() - requestStartTime) / 1000);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[AI] OpenAI API streaming failed after ${requestDuration}s:`, errorMessage);
      throw error;
    }
  }

  private async proofreadWithAnthropic(
    userInput: string,
    systemPrompt: string,
    model: string
  ): Promise<ProofreadingResult[]> {
    const apiKey = await this.getApiKey('anthropic');
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model,
      max_tokens: 50000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userInput }
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return this.parseProofreadingResults(content.text);
    }

    return [];
  }
}

export const proofreadingService = new ProofreadingService();

