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
  private async getApiKey(provider: string): Promise<string> {
    const apiKeyRecord = await storage.getApiKey(provider);
    if (!apiKeyRecord) {
      throw new Error(`${provider} API key not configured`);
    }
    return decrypt(apiKeyRecord.encryptedKey);
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

  private async translateWithOpenAI(
    text: string,
    targetLanguage: string,
    model: string,
    systemPrompt: string
  ): Promise<string> {
    const apiKey = await this.getApiKey('openai');
    
    // Reference: javascript_openai blueprint
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const openai = new OpenAI({ apiKey });

    const userMessage = `Translate to ${targetLanguage}. This is the text: ${text}`;

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_completion_tokens: 8192,
    });

    return response.choices[0].message.content || '';
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
      max_tokens: 8192,
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
}

export const translationService = new TranslationService();
