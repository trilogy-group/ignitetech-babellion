// Reference: javascript_openai and javascript_anthropic blueprints
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { storage } from './storage';
import { decrypt } from './encryption';

interface TranslationRequest {
  text: string;
  targetLanguage: string;
  modelIdentifier: string;
  provider: 'openai' | 'anthropic';
  systemPrompt?: string;
}

interface ProofreadResult {
  proposedChanges: string; // Bullet-point list of proposed changes from Step 1
  finalTranslation: string; // Final proofread translation from Step 2
}

interface ProofreadStep1Result {
  proposedChanges: string; // JSON string of proposed changes
  userInputStep1: string; // User input for step 1 (needed for step 2)
}

export class TranslationService {
  // Models that support reasoning - defined by prefixes that the model identifier starts with
  // Update this list to add/remove models that should use reasoning
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
  private extractTextFromResponse(response: any): string {
    if (response.output && Array.isArray(response.output) && response.output.length > 0) {
      // Find the message item (not reasoning or other types)
      const messageItem = response.output.find((item: any) => item.type === 'message') as any;
      
      if (messageItem && messageItem.content && Array.isArray(messageItem.content) && messageItem.content.length > 0) {
        const contentItem = messageItem.content[0] as any;
        if (contentItem.type === 'output_text' && contentItem.text) {
          return contentItem.text;
        }
      }
    }
    return '';
  }

  /**
   * Extracts and validates JSON from text response.
   * Handles cases where JSON might be wrapped in markdown code blocks or have extra text.
   * Returns the extracted JSON string and logs success/failure.
   */
  private extractJsonFromText(text: string, logPrefix: string = '[AI]'): string {
    if (!text) {
      console.log(`${logPrefix} JSON extraction: No text provided`);
      return '';
    }
    
    // Try to find JSON array in the text
    // First, try to find JSON wrapped in markdown code blocks
    const jsonBlockMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
    if (jsonBlockMatch) {
      try {
        // Validate it's valid JSON
        JSON.parse(jsonBlockMatch[1]);
        console.log(`${logPrefix} JSON extraction: SUCCESS - Extracted JSON from markdown code block`);
        return jsonBlockMatch[1];
      } catch (error) {
        console.log(`${logPrefix} JSON extraction: Failed to parse JSON from markdown block - ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continue to try other methods
      }
    }
    
    // Try to find JSON array directly - use a more robust approach
    // Look for the start of an array and find the matching closing bracket
    const arrayStartIndex = text.indexOf('[');
    if (arrayStartIndex !== -1) {
      let bracketCount = 0;
      let inString = false;
      let escapeNext = false;
      
      for (let i = arrayStartIndex; i < text.length; i++) {
        const char = text[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        
        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (char === '[') {
            bracketCount++;
          } else if (char === ']') {
            bracketCount--;
            if (bracketCount === 0) {
              // Found the matching closing bracket
              const jsonString = text.substring(arrayStartIndex, i + 1);
              try {
                // Validate it's valid JSON
                JSON.parse(jsonString);
                console.log(`${logPrefix} JSON extraction: SUCCESS - Extracted JSON array directly`);
                return jsonString;
              } catch (error) {
                console.log(`${logPrefix} JSON extraction: Failed to parse JSON array - ${error instanceof Error ? error.message : 'Unknown error'}`);
                // Continue to try other methods
              }
            }
          }
        }
      }
    }
    
    // Fallback: try the simple regex approach (non-greedy)
    const jsonArrayMatch = text.match(/(\[[\s\S]*?\])/);
    if (jsonArrayMatch) {
      try {
        // Validate it's valid JSON
        JSON.parse(jsonArrayMatch[1]);
        console.log(`${logPrefix} JSON extraction: SUCCESS - Extracted JSON array with regex fallback`);
        return jsonArrayMatch[1];
      } catch (error) {
        console.log(`${logPrefix} JSON extraction: Failed to parse JSON array with regex - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // If no JSON found, return the original text (fallback)
    console.log(`${logPrefix} JSON extraction: UNSUCCESSFUL - No valid JSON found, returning original text (${text.length} chars)`);
    return text;
  }

  async translate(request: TranslationRequest): Promise<string> {
    const { text, targetLanguage, modelIdentifier, provider, systemPrompt } = request;

    const defaultSystemPrompt = `You are a professional translator. Maintain the tone, style, and formatting of the original text. Only return the translated text, without any explanations or additional commentary.`;

    if (provider === 'openai') {
      return await this.translateWithOpenAI(
        text,
        targetLanguage,
        modelIdentifier,
        systemPrompt || defaultSystemPrompt
      );
    } else if (provider === 'anthropic') {
      return await this.translateWithAnthropic(
        text,
        targetLanguage,
        modelIdentifier,
        systemPrompt || defaultSystemPrompt
      );
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  async proofread(
    originalText: string,
    translatedText: string,
    language: string,
    modelIdentifier: string,
    provider: 'openai' | 'anthropic',
    systemPrompt?: string
  ): Promise<ProofreadResult> {
    // For backward compatibility, call step 1 then step 2
    const step1Result = await this.proofreadStep1(
      originalText,
      translatedText,
      language,
      modelIdentifier,
      provider,
      systemPrompt
    );
    
    const step2Result = await this.proofreadStep2(
      step1Result.userInputStep1,
      step1Result.proposedChanges,
      modelIdentifier,
      provider,
      systemPrompt
    );
    
    return {
      proposedChanges: step1Result.proposedChanges,
      finalTranslation: step2Result,
    };
  }

  async proofreadStep1(
    originalText: string,
    translatedText: string,
    language: string,
    modelIdentifier: string,
    provider: 'openai' | 'anthropic',
    systemPrompt?: string
  ): Promise<ProofreadStep1Result> {
    const defaultSystemPrompt = `You are a linguistic expert in proof reading an original text vs the translated text. 
    You are to understand the original content, and then review the translated content. 
    You will then output a proof read version of the translated content (that only) in the format it's given, preserving the html and any kind of formatting given in the translated content`;
    const userInputStep1 = `Language: ${language}\n\nOriginal content:\n\n${originalText}\n\nTranslated content:\n\n${translatedText}`;

    let proposedChanges: string;
    if (provider === 'openai') {
      proposedChanges = await this.proofreadStep1WithOpenAI(
        userInputStep1,
        modelIdentifier,
        systemPrompt || defaultSystemPrompt
      );
    } else if (provider === 'anthropic') {
      proposedChanges = await this.proofreadStep1WithAnthropic(
        userInputStep1,
        modelIdentifier,
        systemPrompt || defaultSystemPrompt
      );
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    return {
      proposedChanges,
      userInputStep1,
    };
  }

  async proofreadStep2(
    userInputStep1: string,
    proposedChanges: string,
    modelIdentifier: string,
    provider: 'openai' | 'anthropic',
    systemPrompt?: string
  ): Promise<string> {
    const defaultSystemPrompt = `You are a linguistic expert in proof reading an original text vs the translated text. 
    You are to understand the original content, and then review the translated content. 
    You will then output a proof read version of the translated content (that only) in the format it's given, preserving the html and any kind of formatting given in the translated content`;

    if (provider === 'openai') {
      return await this.proofreadStep2WithOpenAI(
        userInputStep1,
        proposedChanges,
        modelIdentifier,
        systemPrompt || defaultSystemPrompt
      );
    } else if (provider === 'anthropic') {
      return await this.proofreadStep2WithAnthropic(
        userInputStep1,
        proposedChanges,
        modelIdentifier,
        systemPrompt || defaultSystemPrompt
      );
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private async translateWithOpenAI(
    text: string,
    targetLanguage: string,
    model: string,
    systemPrompt: string
  ): Promise<string> {
    const apiKey = await this.getApiKey('openai');
    
    // Reference: javascript_openai blueprint
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    // Configure OpenAI client with increased timeout for long-running requests (15 minutes)
    // The SDK uses undici (Node's fetch) which handles keep-alive automatically
    const openai = new OpenAI({ 
      apiKey,
      timeout: 900000, // 15 minutes in milliseconds
      maxRetries: 2,
    });

    const userInput = `Translate to ${targetLanguage}. This is the text: ${text}`;

    // Using responses API: https://platform.openai.com/docs/api-reference/responses/create
    const requestParams: any = {
      model,
      input: userInput,
      instructions: systemPrompt,
      metadata: {
        app: 'babellion',
        service: 'translation',
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
      console.log(`[AI] Starting OpenAI API request for translation, model: ${model}`);
      
      // Create streaming response
      const stream = await openai.responses.create({
        ...requestParams,
        stream: true, // Enable streaming for real-time updates
      } as any) as unknown as AsyncIterable<any>;
      
      // Collect all stream events and find the completed response
      let completedResponse: any = null;
      let responseId: string | undefined;
      
      for await (const event of stream) {
        // Stream events have structure: { type: "response.completed", response: {...}, sequence_number: ... }
        if (event.response) {
          // Store response ID from the first event with a response
          if (!responseId && event.response.id) {
            responseId = event.response.id;
            console.log(`[AI] Streaming response ${responseId}`);
          }
          
          // Check if this is the completed response
          if (event.type === 'response.completed' && event.response.status === 'completed') {
            completedResponse = event.response;
            console.log(`[AI] Received response.completed event for ${event.response.id}`);
            break; // We got the completed response, no need to continue
          } else if (event.response.status === 'failed' || event.response.status === 'cancelled') {
            const errorMsg = event.response.error?.message || 'Unknown error';
            throw new Error(`Response ${event.response.id} ${event.response.status}: ${errorMsg}`);
          }
          
          // Log progress for other event types
          const elapsed = Math.round((Date.now() - requestStartTime) / 1000);
          if (event.type && event.sequence_number && event.sequence_number % 10 === 0) {
            console.log(`[AI] Received event ${event.type} (sequence ${event.sequence_number}, ${elapsed}s elapsed)`);
          }
        }
      }
      
      const duration = Math.round((Date.now() - requestStartTime) / 1000);
      
      // Extract text from completed response
      if (completedResponse && completedResponse.output) {
        console.log(`[AI] Stream completed after ${duration}s`);
        return this.extractTextFromResponse(completedResponse);
      } else if (!completedResponse) {
        throw new Error(`Stream ended without receiving response.completed event (${duration}s elapsed)`);
      } else {
        throw new Error(`Response completed but no output found in response`);
      }
    } catch (error: any) {
      const requestDuration = Math.round((Date.now() - requestStartTime) / 1000);
      console.error(`[AI] OpenAI API streaming failed after ${requestDuration}s:`, error.message);
      throw error;
    }
  }

  private async translateWithAnthropic(
    text: string,
    targetLanguage: string,
    model: string,
    systemPrompt: string
  ): Promise<string> {
    const apiKey = await this.getApiKey('anthropic');
    
    // Reference: javascript_anthropic blueprint
    // The newest Anthropic model is "claude-sonnet-4-20250514"
    const anthropic = new Anthropic({ apiKey });

    const userMessage = `Translate to ${targetLanguage}. This is the text: ${text}`;

    const response = await anthropic.messages.create({
      model,
      max_tokens: 30000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage }
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text;
    }

    return '';
  }

  private async proofreadStep1WithOpenAI(
    userInputStep1: string,
    model: string,
    systemPrompt: string
  ): Promise<string> {
    const apiKey = await this.getApiKey('openai');
    // Configure OpenAI client with increased timeout for long-running requests (15 minutes)
    // The SDK uses undici (Node's fetch) which handles keep-alive automatically
    const openai = new OpenAI({ 
      apiKey,
      timeout: 900000, // 15 minutes in milliseconds
      maxRetries: 2,
    });

    // Step 1: Generate proposed changes
    const step1Prompt = `Step 1: List out all the changes that is required for this to be primarily 100% accurate  to the original source and as fluent as possible in the translated text, into a JSON array format:
[{"original":"original translated text in plain text", "changes":"proposed change to thet translated text in plain text", "reason":"reason in English"}]
You must output this in a valid JSON format only.`;
    
    const step1RequestParams: any = {
      model,
      input: `${userInputStep1}\n\n${step1Prompt}`,
      instructions: systemPrompt,
      metadata: {
        app: 'babellion',
        service: 'proofreading',
        step: '1',
      },
    };

    // Only add reasoning config for models that support it
    if (this.shouldUseReasoning(model)) {
      step1RequestParams.reasoning = {
        effort: "medium",
        summary: "detailed",
      };
    }

    const step1StartTime = Date.now();
    
    try {
      console.log(`[AI] Starting OpenAI API request for proofreading Step 1, model: ${model}`);
      
      // Create streaming response for Step 1
      const step1Stream = await openai.responses.create({
        ...step1RequestParams,
        stream: true,
      } as any) as unknown as AsyncIterable<any>;
      
      let step1CompletedResponse: any = null;
      let step1ResponseId: string | undefined;
      
      for await (const event of step1Stream) {
        if (event.response) {
          if (!step1ResponseId && event.response.id) {
            step1ResponseId = event.response.id;
            console.log(`[AI] Streaming Step 1 response ${step1ResponseId}`);
          }
          
          if (event.type === 'response.completed' && event.response.status === 'completed') {
            step1CompletedResponse = event.response;
            console.log(`[AI] Received Step 1 response.completed event for ${event.response.id}`);
            break;
          } else if (event.response.status === 'failed' || event.response.status === 'cancelled') {
            const errorMsg = event.response.error?.message || 'Unknown error';
            throw new Error(`Step 1 response ${event.response.id} ${event.response.status}: ${errorMsg}`);
          }
        }
      }
      
      const step1Duration = Math.round((Date.now() - step1StartTime) / 1000);
      
      if (!step1CompletedResponse || !step1CompletedResponse.output) {
        throw new Error(`Step 1 stream ended without receiving response.completed event (${step1Duration}s elapsed)`);
      }
      
      const rawResponse = this.extractTextFromResponse(step1CompletedResponse);
      console.log(`[AI] Step 1 raw response length: ${rawResponse.length} characters`);
      const proposedChanges = this.extractJsonFromText(rawResponse, `[AI] OpenAI Step 1`);
      console.log(`[AI] Step 1 completed after ${step1Duration}s, proposedChanges length: ${proposedChanges.length} characters`);
      
      return proposedChanges;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const requestDuration = Math.round((Date.now() - step1StartTime) / 1000);
      console.error(`[AI] OpenAI API proofreading Step 1 failed after ${requestDuration}s:`, errorMessage);
      throw error;
    }
  }

  private async proofreadStep2WithOpenAI(
    userInputStep1: string,
    proposedChanges: string,
    model: string,
    systemPrompt: string
  ): Promise<string> {
    const apiKey = await this.getApiKey('openai');
    const openai = new OpenAI({ 
      apiKey,
      timeout: 900000,
      maxRetries: 2,
    });

    // Step 2: Apply changes to produce final translation
    const step2UserMessage = `Step 2: Now output the new translation only based on your proposed changes. Output only the translated content with the HTML structure intact.`;
    
    // Build conversation history as a single input string
    const step2Input = [
      {
        role: 'user',
        content: userInputStep1,
      },
      {
        role: 'assistant',
        content: proposedChanges,
      },
      {
        role: 'user',
        content: step2UserMessage,
      },
    ];
    
    const step2RequestParams: any = {
      model,
      input: step2Input,
      instructions: systemPrompt,
      metadata: {
        app: 'babellion',
        service: 'proofreading',
        step: '2',
      },
    };

    // Only add reasoning config for models that support it
    if (this.shouldUseReasoning(model)) {
      step2RequestParams.reasoning = {
        effort: "medium",
        summary: "detailed",
      };
    }

    const step2StartTime = Date.now();
    console.log(`[AI] Starting OpenAI API request for proofreading Step 2, model: ${model}`);
    
    try {
      // Use responses API like step 1
      const step2Stream = await openai.responses.create({
        ...step2RequestParams,
        stream: true,
      } as any) as unknown as AsyncIterable<any>;
      
      let step2CompletedResponse: any = null;
      let step2ResponseId: string | undefined;
      
      for await (const event of step2Stream) {
        if (event.response) {
          if (!step2ResponseId && event.response.id) {
            step2ResponseId = event.response.id;
            console.log(`[AI] Streaming Step 2 response ${step2ResponseId}`);
          }
          
          if (event.type === 'response.completed' && event.response.status === 'completed') {
            step2CompletedResponse = event.response;
            console.log(`[AI] Received Step 2 response.completed event for ${event.response.id}`);
            break;
          } else if (event.response.status === 'failed' || event.response.status === 'cancelled') {
            const errorMsg = event.response.error?.message || 'Unknown error';
            throw new Error(`Step 2 response ${event.response.id} ${event.response.status}: ${errorMsg}`);
          }
        }
      }
      
      const step2Duration = Math.round((Date.now() - step2StartTime) / 1000);
      
      if (!step2CompletedResponse || !step2CompletedResponse.output) {
        throw new Error(`Step 2 stream ended without receiving response.completed event (${step2Duration}s elapsed)`);
      }
      
      const finalTranslation = this.extractTextFromResponse(step2CompletedResponse);
      console.log(`[AI] Step 2 completed after ${step2Duration}s`);
      
      return finalTranslation;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const requestDuration = Math.round((Date.now() - step2StartTime) / 1000);
      console.error(`[AI] OpenAI API proofreading Step 2 failed after ${requestDuration}s:`, errorMessage);
      throw error;
    }
  }

  private async proofreadStep1WithAnthropic(
    userInputStep1: string,
    model: string,
    systemPrompt: string
  ): Promise<string> {
    const apiKey = await this.getApiKey('anthropic');
    const anthropic = new Anthropic({ apiKey });

    // Step 1: Generate proposed changes
    const step1Prompt = `List out all the changes that is required for this to be 100% fluent and accurate to the original source as a JSON array format:
[{"original":"original text in plain text", "changes":"changes text in plain text", "reason":"reason in English"}]
You must output this in a valid JSON format only.`;
    
    const step1Response = await anthropic.messages.create({
      model,
      max_tokens: 30000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: `${userInputStep1}\n\n${step1Prompt}` }
      ],
    });

    const step1Content = step1Response.content[0];
    if (step1Content.type !== 'text') {
      throw new Error('Step 1 response is not text');
    }
    const rawResponse = step1Content.text;
    console.log(`[AI] Anthropic Step 1 raw response length: ${rawResponse.length} characters`);
    const proposedChanges = this.extractJsonFromText(rawResponse, `[AI] Anthropic Step 1`);
    console.log(`[AI] Anthropic Step 1 completed, proposedChanges length: ${proposedChanges.length} characters`);

    return proposedChanges;
  }

  private async proofreadStep2WithAnthropic(
    userInputStep1: string,
    proposedChanges: string,
    model: string,
    systemPrompt: string
  ): Promise<string> {
    const apiKey = await this.getApiKey('anthropic');
    const anthropic = new Anthropic({ apiKey });

    // Step 2: Apply changes to produce final translation
    const step1Prompt = `List out all the changes that is required for this to be 100% fluent and accurate to the original source as a JSON array format:
[{"original":"original text in plain text", "changes":"changes text in plain text", "reason":"reason in English"}]
You must output this in a valid JSON format only.`;
    const step2UserMessage = `Now output the new translation only based on your proposed changes. Output only the translated content with the HTML structure intact.`;
    
    const step2Response = await anthropic.messages.create({
      model,
      max_tokens: 30000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: `${userInputStep1}\n\n${step1Prompt}` },
        { role: 'assistant', content: proposedChanges },
        { role: 'user', content: step2UserMessage }
      ],
    });

    const step2Content = step2Response.content[0];
    if (step2Content.type !== 'text') {
      throw new Error('Step 2 response is not text');
    }
    const finalTranslation = step2Content.text;

    return finalTranslation;
  }

}

export const translationService = new TranslationService();
