import OpenAI, { toFile } from 'openai';
import { GoogleGenAI } from '@google/genai';
import { storage } from './storage';
import { decrypt } from './encryption';

interface ImageEditRequest {
  imageDataUri: string; // "data:image/png;base64,..."
  prompt: string;
  model: 'openai' | 'gemini';
}

interface ImageEditResult {
  editedImageBase64: string;
  editedMimeType: string;
  outputTokens: number;
}

export class ImageEditService {
  private async getApiKey(provider: string): Promise<string> {
    const apiKeyRecord = await storage.getApiKey(provider);
    if (!apiKeyRecord) {
      throw new Error(`${provider} API key not configured`);
    }
    return decrypt(apiKeyRecord.encryptedKey);
  }

  /**
   * Parse a data URI to extract base64 data and mime type
   */
  private parseDataUri(dataUri: string): { base64: string; mimeType: string } {
    const match = dataUri.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      throw new Error('Invalid data URI format');
    }
    return {
      mimeType: match[1],
      base64: match[2],
    };
  }

  /**
   * Edit an image using OpenAI's gpt-image-1 model
   */
  private async editWithOpenAI(imageBase64: string, _mimeType: string, prompt: string): Promise<ImageEditResult> {
    const apiKey = await this.getApiKey('openai');
    const openai = new OpenAI({ apiKey });

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    // Convert to File object (OpenAI SDK requirement)
    const imageFile = await toFile(imageBuffer, 'source-image.png', { type: 'image/png' });

    try {
      // Call OpenAI images.edit API
      const response = await openai.images.edit({
        model: 'gpt-image-1.5',
        image: imageFile,
        prompt: prompt,
      });

      // Extract the result
      if (!response.data || response.data.length === 0) {
        throw new Error('No response from OpenAI');
      }

      const result = response.data[0];

      // Handle b64_json response
      // Note: OpenAI image generation doesn't provide token counts, so we use 0
      if (result.b64_json) {
        return {
          editedImageBase64: result.b64_json,
          editedMimeType: 'image/png',
          outputTokens: 0,
        };
      }

      // Handle URL response (need to fetch and convert to base64)
      if (result.url) {
        const imageResponse = await fetch(result.url);
        const arrayBuffer = await imageResponse.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        return {
          editedImageBase64: base64,
          editedMimeType: 'image/png',
          outputTokens: 0,
        };
      }

      throw new Error('No image data in OpenAI response');
    } catch (error) {
      // Log the error for debugging
      console.error('OpenAI image edit error:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('safety system')) {
          throw new Error('The image or prompt was flagged by OpenAI\'s safety system. Please try a different image or prompt.');
        }
        if (error.message.includes('rate limit')) {
          throw new Error('OpenAI rate limit reached. Please try again in a moment.');
        }
        throw error;
      }
      throw new Error('Failed to edit image with OpenAI');
    }
  }

  /**
   * Edit an image using Google Gemini
   */
  private async editWithGemini(imageBase64: string, mimeType: string, prompt: string): Promise<ImageEditResult> {
    const apiKey = await this.getApiKey('gemini');
    const ai = new GoogleGenAI({ apiKey });

    // Construct the edit prompt
    const editPrompt = `Edit this image according to the following instructions. 
Preserve all elements of the image that are not explicitly mentioned in the instructions.
Apply the changes naturally and seamlessly.

Instructions: ${prompt}`;

    const contents = [
      { text: editPrompt },
      {
        inlineData: {
          mimeType: mimeType,
          data: imageBase64,
        },
      },
    ];

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
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

      // Extract token usage from response metadata
      const usageMetadata = response.usageMetadata as Record<string, unknown> | undefined;
      const outputTokens = (usageMetadata?.candidatesTokenCount as number) || 0;

      // Find the image part in the response
      for (const part of content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return {
            editedImageBase64: part.inlineData.data,
            editedMimeType: part.inlineData.mimeType || 'image/png',
            outputTokens,
          };
        }
      }

      // If only text was returned, check if there's an explanation
      const textParts = content.parts.filter(part => part.text);
      if (textParts.length > 0) {
        const explanation = textParts.map(p => p.text).join(' ');
        throw new Error(`Gemini could not edit the image: ${explanation.slice(0, 200)}`);
      }

      throw new Error('No edited image received from Gemini. The model may not support this type of edit.');
    } catch (error) {
      console.error('Gemini image edit error:', error);
      
      if (error instanceof Error) {
        // Pass through our custom errors
        if (error.message.startsWith('Gemini could not edit') || error.message.includes('No edited image')) {
          throw error;
        }
        if (error.message.includes('SAFETY')) {
          throw new Error('The image or prompt was flagged by Gemini\'s safety system. Please try a different image or prompt.');
        }
      }
      throw new Error('Failed to edit image with Gemini');
    }
  }

  /**
   * Main edit method - routes to appropriate AI service
   */
  async editImage(request: ImageEditRequest): Promise<ImageEditResult> {
    const { imageDataUri, prompt, model } = request;

    // Parse the data URI
    const { base64, mimeType } = this.parseDataUri(imageDataUri);

    // Route to appropriate service
    if (model === 'gemini') {
      return this.editWithGemini(base64, mimeType, prompt);
    } else {
      return this.editWithOpenAI(base64, mimeType, prompt);
    }
  }
}

export const imageEditService = new ImageEditService();

