import { GoogleGenAI } from '@google/genai';
import { storage } from './storage';
import { decrypt } from './encryption';

interface ImageTranslationRequest {
  imageBase64: string;
  mimeType: string;
  targetLanguage: string;
  systemPrompt?: string;
  modelIdentifier: string;
}

interface ImageTranslationResult {
  translatedImageBase64: string;
  translatedMimeType: string;
}

export class ImageTranslationService {
  private async getApiKey(): Promise<string> {
    const apiKeyRecord = await storage.getApiKey('gemini');
    if (!apiKeyRecord) {
      throw new Error('Gemini API key not configured');
    }
    return decrypt(apiKeyRecord.encryptedKey);
  }

  async translateImage(request: ImageTranslationRequest): Promise<ImageTranslationResult> {
    const { imageBase64, mimeType, targetLanguage, systemPrompt, modelIdentifier } = request;

    const apiKey = await this.getApiKey();
    const ai = new GoogleGenAI({ apiKey });

    const defaultSystemPrompt = `Translate all text visible in this image to ${targetLanguage}. 
Preserve the original image layout, styling, fonts, and visual design as closely as possible.
Replace the original text with the translated text in the same positions.
Maintain the same color scheme and visual elements.
Only translate text that is part of the image content - do not add explanations or commentary.`;

    const prompt = systemPrompt 
      ? systemPrompt.replace('{language}', targetLanguage)
      : defaultSystemPrompt;

    const contents = [
      { text: prompt },
      {
        inlineData: {
          mimeType: mimeType,
          data: imageBase64,
        },
      },
    ];

    const response = await ai.models.generateContent({
      model: modelIdentifier,
      contents: contents,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          imageSize: '1K',
        },
      },
    });

    // Extract the image from the response
    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('No response received from Gemini');
    }

    const content = response.candidates[0].content;
    if (!content || !content.parts) {
      throw new Error('Invalid response structure from Gemini');
    }

    // Find the image part in the response
    for (const part of content.parts) {
      if (part.inlineData && part.inlineData.data) {
        return {
          translatedImageBase64: part.inlineData.data,
          translatedMimeType: part.inlineData.mimeType || 'image/png',
        };
      }
    }

    // If no image was returned, throw an error
    throw new Error('No translated image received from Gemini. The model may have returned text only.');
  }
}

export const imageTranslationService = new ImageTranslationService();

