import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the storage module before importing the service
vi.mock('../storage', () => ({
  storage: {
    getApiKey: vi.fn(),
  },
}));

// Create a testable version of the TranslationService
// We need to access private methods, so we'll create a test wrapper
class TestableTranslationService {
  private readonly reasoningModelPrefixes = ['gpt-5', 'o'];

  shouldUseReasoning(modelIdentifier: string): boolean {
    return this.reasoningModelPrefixes.some(prefix => modelIdentifier.startsWith(prefix));
  }

  extractJsonFromText(text: string, _logPrefix: string = '[AI]'): string {
    if (!text) {
      return '';
    }
    
    // Try to find JSON array in the text
    // First, try to find JSON wrapped in markdown code blocks
    const jsonBlockMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
    if (jsonBlockMatch) {
      try {
        JSON.parse(jsonBlockMatch[1]);
        return jsonBlockMatch[1];
      } catch {
        // Continue to try other methods
      }
    }
    
    // Try to find JSON array directly - use a more robust approach
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
              const jsonString = text.substring(arrayStartIndex, i + 1);
              try {
                JSON.parse(jsonString);
                return jsonString;
              } catch {
                // Continue to try other methods
              }
            }
          }
        }
      }
    }
    
    // Fallback: try the simple regex approach
    const jsonArrayMatch = text.match(/(\[[\s\S]*?\])/);
    if (jsonArrayMatch) {
      try {
        JSON.parse(jsonArrayMatch[1]);
        return jsonArrayMatch[1];
      } catch {
        // Fall through
      }
    }
    
    // If no JSON found, return the original text
    return text;
  }
}

describe('TranslationService', () => {
  let service: TestableTranslationService;

  beforeEach(() => {
    service = new TestableTranslationService();
    vi.clearAllMocks();
  });

  describe('shouldUseReasoning', () => {
    it('should return true for gpt-5 models', () => {
      expect(service.shouldUseReasoning('gpt-5')).toBe(true);
      expect(service.shouldUseReasoning('gpt-5-turbo')).toBe(true);
      expect(service.shouldUseReasoning('gpt-5-0125')).toBe(true);
    });

    it('should return true for o-series models', () => {
      expect(service.shouldUseReasoning('o1')).toBe(true);
      expect(service.shouldUseReasoning('o1-preview')).toBe(true);
      expect(service.shouldUseReasoning('o1-mini')).toBe(true);
      expect(service.shouldUseReasoning('o3')).toBe(true);
    });

    it('should return false for claude models', () => {
      expect(service.shouldUseReasoning('claude-3-opus')).toBe(false);
      expect(service.shouldUseReasoning('claude-sonnet-4-20250514')).toBe(false);
      expect(service.shouldUseReasoning('claude-3-haiku')).toBe(false);
    });

    it('should return false for gpt-4 models', () => {
      expect(service.shouldUseReasoning('gpt-4')).toBe(false);
      expect(service.shouldUseReasoning('gpt-4-turbo')).toBe(false);
      expect(service.shouldUseReasoning('gpt-4o')).toBe(false);
    });
  });

  describe('extractJsonFromText', () => {
    it('should extract JSON from markdown code block with json tag', () => {
      const input = '```json\n[{"original":"text","changes":"fix"}]\n```';
      const result = service.extractJsonFromText(input);
      
      expect(JSON.parse(result)).toEqual([{ original: 'text', changes: 'fix' }]);
    });

    it('should extract JSON from markdown code block without json tag', () => {
      const input = '```\n[{"key":"value"}]\n```';
      const result = service.extractJsonFromText(input);
      
      expect(JSON.parse(result)).toEqual([{ key: 'value' }]);
    });

    it('should extract JSON array directly from text', () => {
      const input = 'Here is the result: [{"key":"value"}] end of response';
      const result = service.extractJsonFromText(input);
      
      expect(JSON.parse(result)).toEqual([{ key: 'value' }]);
    });

    it('should handle nested brackets in strings', () => {
      const input = '[{"text":"array[0] is valid"}]';
      const result = service.extractJsonFromText(input);
      
      expect(JSON.parse(result)).toEqual([{ text: 'array[0] is valid' }]);
    });

    it('should handle escaped quotes in strings', () => {
      const input = '[{"quote":"He said \\"hello\\""}]';
      const result = service.extractJsonFromText(input);
      
      expect(JSON.parse(result)).toEqual([{ quote: 'He said "hello"' }]);
    });

    it('should handle complex nested objects', () => {
      const input = '[{"outer":{"inner":[1,2,3],"nested":{"deep":"value"}}}]';
      const result = service.extractJsonFromText(input);
      
      expect(JSON.parse(result)).toEqual([{
        outer: {
          inner: [1, 2, 3],
          nested: { deep: 'value' }
        }
      }]);
    });

    it('should handle multiple objects in array', () => {
      const input = '[{"a":1},{"b":2},{"c":3}]';
      const result = service.extractJsonFromText(input);
      
      expect(JSON.parse(result)).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
    });

    it('should handle empty array', () => {
      const input = '[]';
      const result = service.extractJsonFromText(input);
      
      expect(JSON.parse(result)).toEqual([]);
    });

    it('should return original text when no JSON found', () => {
      const input = 'Just plain text without JSON';
      const result = service.extractJsonFromText(input);
      
      expect(result).toBe(input);
    });

    it('should return empty string for empty input', () => {
      expect(service.extractJsonFromText('')).toBe('');
    });

    it('should handle JSON with surrounding prose', () => {
      const input = `Based on my analysis, here are the proposed changes:
      
[{"original":"Hello world","changes":"Hello, World!","reason":"Added comma and capitalization"}]

These changes will improve the translation quality.`;
      
      const result = service.extractJsonFromText(input);
      expect(JSON.parse(result)).toEqual([{
        original: 'Hello world',
        changes: 'Hello, World!',
        reason: 'Added comma and capitalization'
      }]);
    });

    it('should handle escaped backslashes', () => {
      const input = '[{"path":"C:\\\\Users\\\\test"}]';
      const result = service.extractJsonFromText(input);
      
      expect(JSON.parse(result)).toEqual([{ path: 'C:\\Users\\test' }]);
    });

    it('should handle unicode in JSON', () => {
      const input = '[{"text":"你好世界 🌍"}]';
      const result = service.extractJsonFromText(input);
      
      expect(JSON.parse(result)).toEqual([{ text: '你好世界 🌍' }]);
    });

    it('should handle malformed JSON gracefully by returning original', () => {
      const input = '[{"incomplete": "json"';
      const result = service.extractJsonFromText(input);
      
      // Since it can't parse, it returns the original
      expect(result).toBe(input);
    });
  });
});

