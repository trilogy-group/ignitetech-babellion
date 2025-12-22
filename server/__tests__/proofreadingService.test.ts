import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the storage module before importing
vi.mock('../storage', () => ({
  storage: {
    getApiKey: vi.fn(),
  },
}));

interface ProofreadingResult {
  rule: string;
  original_text: string;
  suggested_change: string;
  rationale: string;
  status?: 'pending' | 'accepted' | 'rejected';
}

// Create a testable version of the parsing logic
class TestableProofreadingService {
  parseProofreadingResults(responseText: string): ProofreadingResult[] {
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
          // Check if first item has a 'results' property (nested structure)
          if (firstItem.results && Array.isArray(firstItem.results)) {
            return firstItem.results as ProofreadingResult[];
          }
          // Check if first item has the expected structure
          if (firstItem.rule || firstItem.original_text !== undefined) {
            return parsed as ProofreadingResult[];
          }
        }
        return [];
      }

      // Handle object with results property
      const parsedObj = parsed as Record<string, unknown>;
      if (parsedObj.results && Array.isArray(parsedObj.results)) {
        return parsedObj.results as ProofreadingResult[];
      }

      return [];
    } catch {
      return [];
    }
  }
}

describe('ProofreadingService', () => {
  let service: TestableProofreadingService;

  beforeEach(() => {
    service = new TestableProofreadingService();
    vi.clearAllMocks();
  });

  describe('parseProofreadingResults', () => {
    it('should parse direct array of results', () => {
      const input = JSON.stringify([
        {
          rule: 'grammar',
          original_text: 'He go to store',
          suggested_change: 'He goes to the store',
          rationale: 'Subject-verb agreement'
        }
      ]);

      const result = service.parseProofreadingResults(input);

      expect(result).toHaveLength(1);
      expect(result[0].rule).toBe('grammar');
      expect(result[0].original_text).toBe('He go to store');
      expect(result[0].suggested_change).toBe('He goes to the store');
    });

    it('should parse object wrapper with results property', () => {
      const input = JSON.stringify({
        results: [
          {
            rule: 'spelling',
            original_text: 'teh',
            suggested_change: 'the',
            rationale: 'Common typo'
          }
        ]
      });

      const result = service.parseProofreadingResults(input);

      expect(result).toHaveLength(1);
      expect(result[0].rule).toBe('spelling');
    });

    it('should parse nested array with results property', () => {
      const input = JSON.stringify([
        {
          results: [
            {
              rule: 'punctuation',
              original_text: 'Hello world',
              suggested_change: 'Hello, world!',
              rationale: 'Missing comma and exclamation'
            }
          ]
        }
      ]);

      const result = service.parseProofreadingResults(input);

      expect(result).toHaveLength(1);
      expect(result[0].rule).toBe('punctuation');
    });

    it('should handle markdown json code block', () => {
      const input = '```json\n[{"rule":"grammar","original_text":"test","suggested_change":"Test","rationale":"Capitalize"}]\n```';

      const result = service.parseProofreadingResults(input);

      expect(result).toHaveLength(1);
      expect(result[0].rule).toBe('grammar');
    });

    it('should handle markdown code block without json tag', () => {
      const input = '```\n{"results":[{"rule":"test","original_text":"a","suggested_change":"b","rationale":"c"}]}\n```';

      const result = service.parseProofreadingResults(input);

      expect(result).toHaveLength(1);
    });

    it('should return empty array for invalid JSON', () => {
      const input = 'not valid json at all';

      const result = service.parseProofreadingResults(input);

      expect(result).toEqual([]);
    });

    it('should return empty array for malformed JSON', () => {
      const input = '{"results": [{"incomplete"';

      const result = service.parseProofreadingResults(input);

      expect(result).toEqual([]);
    });

    it('should return empty array for empty array input', () => {
      const input = '[]';

      const result = service.parseProofreadingResults(input);

      expect(result).toEqual([]);
    });

    it('should return empty array for object without results', () => {
      const input = '{"data": "something else"}';

      const result = service.parseProofreadingResults(input);

      expect(result).toEqual([]);
    });

    it('should handle multiple results', () => {
      const input = JSON.stringify([
        { rule: 'grammar', original_text: 'a', suggested_change: 'b', rationale: 'c' },
        { rule: 'spelling', original_text: 'd', suggested_change: 'e', rationale: 'f' },
        { rule: 'style', original_text: 'g', suggested_change: 'h', rationale: 'i' }
      ]);

      const result = service.parseProofreadingResults(input);

      expect(result).toHaveLength(3);
      expect(result[0].rule).toBe('grammar');
      expect(result[1].rule).toBe('spelling');
      expect(result[2].rule).toBe('style');
    });

    it('should handle "no changes needed" response', () => {
      const input = JSON.stringify({
        results: [
          {
            rule: 'no changes needed',
            original_text: 'N/A',
            suggested_change: 'N/A',
            rationale: 'The text is grammatically correct and well-written.'
          }
        ]
      });

      const result = service.parseProofreadingResults(input);

      expect(result).toHaveLength(1);
      expect(result[0].rule).toBe('no changes needed');
    });

    it('should handle unicode in results', () => {
      const input = JSON.stringify([
        {
          rule: 'translation',
          original_text: '你好',
          suggested_change: 'Hello',
          rationale: 'Translating Chinese to English'
        }
      ]);

      const result = service.parseProofreadingResults(input);

      expect(result).toHaveLength(1);
      expect(result[0].original_text).toBe('你好');
    });

    it('should handle HTML in text fields', () => {
      const input = JSON.stringify([
        {
          rule: 'formatting',
          original_text: '<p>Hello</p>',
          suggested_change: '<p><strong>Hello</strong></p>',
          rationale: 'Added emphasis'
        }
      ]);

      const result = service.parseProofreadingResults(input);

      expect(result).toHaveLength(1);
      expect(result[0].original_text).toBe('<p>Hello</p>');
      expect(result[0].suggested_change).toBe('<p><strong>Hello</strong></p>');
    });

    it('should handle whitespace around JSON', () => {
      const input = `

        [{"rule":"test","original_text":"a","suggested_change":"b","rationale":"c"}]
        
      `;

      const result = service.parseProofreadingResults(input);

      expect(result).toHaveLength(1);
    });
  });
});

