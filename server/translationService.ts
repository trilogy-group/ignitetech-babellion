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
  ): Promise<string> {
    const defaultSystemPrompt = `You are a linguistic expert in proof reading an original text vs the translated text. You are to understand the original content, and then review the translated content. You will then output a proof read version of the translated content (that only) in the format it's given, preserving the html and any kind of formatting given in the translated content`;

    const userInput = `Language: ${language}\n\nOriginal content:\n\n${originalText}\n\nTranslated content:\n\n${translatedText}`;

    if (provider === 'openai') {
      return await this.proofreadWithOpenAI(
        userInput,
        modelIdentifier,
        systemPrompt || defaultSystemPrompt
      );
    } else if (provider === 'anthropic') {
      return await this.proofreadWithAnthropic(
        userInput,
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
      max_output_tokens: 50000,
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
      max_tokens: 50000,
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

  private async proofreadWithOpenAI(
    userInput: string,
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

    // Using responses API: https://platform.openai.com/docs/api-reference/responses/create
    const requestParams: any = {
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

  private async proofreadWithAnthropic(
    userInput: string,
    model: string,
    systemPrompt: string
  ): Promise<string> {
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
      return content.text;
    }

    return '';
  }
}

export const translationService = new TranslationService();
