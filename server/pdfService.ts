/**
 * PDF Import Service
 * 
 * Provides two methods for importing PDF content:
 * - Quick Import: Basic text extraction using pdf-parse
 * - Deep Import: Text extraction + LLM-based formatting using Anthropic Claude
 */

import { PDFParse } from 'pdf-parse';
import Anthropic from '@anthropic-ai/sdk';
import { storage } from './storage';
import { decrypt } from './encryption';

// Parse PDF buffer using pdf-parse v2 API
async function parsePdf(buffer: Buffer): Promise<{ text: string; numpages: number; info: unknown }> {
  const parser = new PDFParse({ data: buffer });
  
  // Get text content
  const textResult = await parser.getText();
  
  // Get info for page count
  const infoResult = await parser.getInfo();
  
  // Clean up
  await parser.destroy();
  
  return {
    text: textResult.text,
    numpages: infoResult.total,
    info: infoResult.info,
  };
}

export interface PdfImportResult {
  text: string;
  html: string;
  pageCount: number;
  info?: Record<string, unknown>;
}

export interface DeepImportOptions {
  modelIdentifier: string;
}

export class PdfService {
  /**
   * Get the Anthropic API key from storage
   */
  private async getAnthropicApiKey(): Promise<string> {
    const apiKeyRecord = await storage.getApiKey('anthropic');
    if (!apiKeyRecord) {
      throw new Error('Anthropic API key not configured. Please configure it in Settings.');
    }
    return decrypt(apiKeyRecord.encryptedKey);
  }

  /**
   * Quick Import - Basic text extraction from PDF
   * 
   * Extracts raw text and applies basic heuristics to convert to HTML:
   * - Double newlines become paragraph breaks
   * - Lines ending with punctuation continue same paragraph
   * - Preserves basic structure
   */
  async quickImport(pdfBuffer: Buffer): Promise<PdfImportResult> {
    const data = await parsePdf(pdfBuffer);
    
    // Extract raw text
    const rawText = data.text;
    
    // Apply basic heuristics to convert to HTML
    const html = this.textToBasicHtml(rawText);
    
    return {
      text: rawText,
      html,
      pageCount: data.numpages,
      info: data.info as Record<string, unknown>,
    };
  }

  /**
   * Deep Import - Native PDF processing with Claude
   * 
   * Uses Anthropic Claude's native PDF support to directly read and convert
   * the PDF to well-structured HTML, preserving the original formatting.
   */
  async deepImport(pdfBuffer: Buffer, options: DeepImportOptions): Promise<PdfImportResult> {
    // Get page count using pdf-parse (for metadata)
    const data = await parsePdf(pdfBuffer);
    
    // Use Claude's native PDF support for better formatting preservation
    const html = await this.formatPdfWithClaude(pdfBuffer, options.modelIdentifier);
    
    // Extract plain text for the text field (from the HTML)
    const tempDiv = html ? html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
    
    return {
      text: tempDiv,
      html,
      pageCount: data.numpages,
      info: data.info as Record<string, unknown>,
    };
  }

  /**
   * Use Claude's native PDF document support to convert PDF to HTML
   */
  private async formatPdfWithClaude(pdfBuffer: Buffer, modelIdentifier: string): Promise<string> {
    const apiKey = await this.getAnthropicApiKey();
    const anthropic = new Anthropic({ apiKey });

    // Convert PDF buffer to base64
    const pdfBase64 = pdfBuffer.toString('base64');

    const systemPrompt = `You are a document formatting expert. Your task is to convert the PDF document into clean, well-structured HTML that preserves the original formatting as closely as possible.

Guidelines:
1. Preserve the document's logical structure (headings, paragraphs, lists)
2. Use appropriate HTML tags:
   - <h1>, <h2>, <h3> for headings based on their hierarchy in the PDF
   - <p> for paragraphs
   - <ul>/<li> for bullet lists
   - <ol>/<li> for numbered lists
   - <strong> for bold text
   - <em> for italic text
3. Preserve the reading order and document flow
4. Identify and properly format:
   - Section headers and titles (use appropriate heading levels)
   - Numbered/bulleted lists
   - Tables (use <table>, <tr>, <td> tags)
   - Paragraphs
5. Do NOT add any content not present in the original PDF
6. Do NOT wrap the result in \`\`\`html or any code blocks
7. Output ONLY the HTML content, nothing else`;

    console.log(`[PDF] Starting native PDF processing with model: ${modelIdentifier}`);
    const startTime = Date.now();

    // Use streaming for long operations
    const stream = anthropic.messages.stream({
      model: modelIdentifier,
      max_tokens: 30000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: 'Convert this PDF document to clean, well-structured HTML that preserves the original formatting. Output only the HTML content.',
            },
          ],
        },
      ],
    });

    // Collect streamed text
    let fullText = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullText += event.delta.text;
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`[PDF] Native PDF processing completed in ${duration}s`);

    // Clean up any accidental code block wrappers
    let html = fullText.trim();
    if (html.startsWith('```html')) {
      html = html.replace(/^```html\s*/, '').replace(/\s*```$/, '');
    } else if (html.startsWith('```')) {
      html = html.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return html;
  }

  /**
   * Convert raw text to basic HTML using simple heuristics
   */
  private textToBasicHtml(text: string): string {
    if (!text.trim()) {
      return '';
    }

    // Split by double newlines to identify paragraphs
    const sections = text.split(/\n\s*\n/);
    
    const htmlParts: string[] = [];
    
    for (const section of sections) {
      const trimmed = section.trim();
      if (!trimmed) continue;
      
      // Check if it looks like a heading (short, no ending punctuation, possibly all caps or title case)
      const isShortLine = trimmed.length < 100;
      const endsWithPunctuation = /[.!?:;,]$/.test(trimmed);
      const isAllCaps = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
      const looksLikeHeading = isShortLine && !endsWithPunctuation && (isAllCaps || /^(Chapter|Section|\d+\.|[IVX]+\.)/i.test(trimmed));
      
      if (looksLikeHeading) {
        // Determine heading level based on characteristics
        if (isAllCaps && trimmed.length < 50) {
          htmlParts.push(`<h2>${this.escapeHtml(trimmed)}</h2>`);
        } else if (/^(Chapter|\d+\.)/i.test(trimmed)) {
          htmlParts.push(`<h2>${this.escapeHtml(trimmed)}</h2>`);
        } else {
          htmlParts.push(`<h3>${this.escapeHtml(trimmed)}</h3>`);
        }
      } else {
        // Check for list items
        const lines = trimmed.split('\n');
        const listItems = lines.filter(line => /^[\s]*[-•*]\s/.test(line) || /^[\s]*\d+[.)]\s/.test(line));
        
        if (listItems.length > 1 && listItems.length === lines.length) {
          // It's a list
          const isOrdered = lines.every(line => /^[\s]*\d+[.)]\s/.test(line));
          const tag = isOrdered ? 'ol' : 'ul';
          const items = lines.map(line => {
            const content = line.replace(/^[\s]*[-•*\d.)\s]+/, '').trim();
            return `<li>${this.escapeHtml(content)}</li>`;
          }).join('\n');
          htmlParts.push(`<${tag}>\n${items}\n</${tag}>`);
        } else {
          // Regular paragraph - join single newlines with spaces
          const content = trimmed.replace(/\n/g, ' ').replace(/\s+/g, ' ');
          htmlParts.push(`<p>${this.escapeHtml(content)}</p>`);
        }
      }
    }
    
    return htmlParts.join('\n');
  }

  /**
   * Use Anthropic Claude to intelligently format text into HTML
   */
  private async formatWithLlm(text: string, modelIdentifier: string): Promise<string> {
    const apiKey = await this.getAnthropicApiKey();
    const anthropic = new Anthropic({ apiKey });

    // Truncate text if it's too long (Claude has context limits)
    const maxChars = 100000;
    const truncatedText = text.length > maxChars 
      ? text.substring(0, maxChars) + '\n\n[Content truncated due to length]'
      : text;

    const systemPrompt = `You are a document formatting expert. Your task is to convert raw text extracted from a PDF into clean, well-structured HTML.

Guidelines:
1. Preserve the document's logical structure (headings, paragraphs, lists)
2. Use appropriate HTML tags:
   - <h1>, <h2>, <h3> for headings based on their hierarchy
   - <p> for paragraphs
   - <ul>/<li> for bullet lists
   - <ol>/<li> for numbered lists
   - <strong> for emphasis/bold text where evident
   - <em> for italics where evident
3. Merge broken lines that are part of the same paragraph
4. Identify and properly format:
   - Section headers and titles
   - Numbered/bulleted lists
   - Paragraphs
5. Do NOT add any content not present in the original
6. Do NOT wrap the result in \`\`\`html or any code blocks
7. Output ONLY the HTML content, nothing else`;

    const userPrompt = `Convert this raw text extracted from a PDF into well-structured HTML. Output only the HTML, no explanations:

${truncatedText}`;

    console.log(`[PDF] Starting LLM formatting with model: ${modelIdentifier}`);
    const startTime = Date.now();

    // Use streaming to handle long operations (required by Anthropic SDK for operations > 10 min)
    const stream = anthropic.messages.stream({
      model: modelIdentifier,
      max_tokens: 30000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
    });

    // Collect streamed text
    let fullText = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullText += event.delta.text;
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`[PDF] LLM formatting completed in ${duration}s`);

    // Clean up any accidental code block wrappers
    let html = fullText.trim();
    if (html.startsWith('```html')) {
      html = html.replace(/^```html\s*/, '').replace(/\s*```$/, '');
    } else if (html.startsWith('```')) {
      html = html.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return html;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export const pdfService = new PdfService();
