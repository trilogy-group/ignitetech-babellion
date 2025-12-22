import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  insertTranslationSchema,
  insertProofreadingSchema,
  insertAiModelSchema,
  insertLanguageSchema,
  insertSettingSchema,
  insertTranslationFeedbackSchema,
  insertProofreadingRuleCategorySchema,
  insertProofreadingRuleSchema,
  insertImageTranslationSchema,
} from '../schema';

describe('Zod Schemas', () => {
  describe('insertTranslationSchema', () => {
    it('should validate valid translation input', () => {
      const input = {
        title: 'Test Translation',
        sourceText: 'Hello, world!',
      };

      const result = insertTranslationSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Test Translation');
        expect(result.data.sourceText).toBe('Hello, world!');
      }
    });

    it('should allow omitting isPrivate (database handles default)', () => {
      const input = {
        title: 'Test',
        sourceText: 'Text',
      };

      const result = insertTranslationSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        // isPrivate is optional at Zod level - database applies default
        expect(result.data.isPrivate).toBeUndefined();
      }
    });

    it('should accept explicit isPrivate value', () => {
      const input = {
        title: 'Test',
        sourceText: 'Text',
        isPrivate: true,
      };

      const result = insertTranslationSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isPrivate).toBe(true);
      }
    });

    it('should reject missing title', () => {
      const input = {
        sourceText: 'Text',
      };

      const result = insertTranslationSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject missing sourceText', () => {
      const input = {
        title: 'Title',
      };

      const result = insertTranslationSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should accept selectedLanguages array', () => {
      const input = {
        title: 'Test',
        sourceText: 'Text',
        selectedLanguages: ['en', 'es', 'fr'],
      };

      const result = insertTranslationSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('insertProofreadingSchema', () => {
    it('should validate valid proofreading input', () => {
      const input = {
        title: 'Test Proofreading',
        sourceText: 'Check this text.',
      };

      const result = insertProofreadingSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept selectedCategories array', () => {
      const input = {
        title: 'Test',
        sourceText: 'Text',
        selectedCategories: ['cat-1', 'cat-2'],
      };

      const result = insertProofreadingSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.selectedCategories).toEqual(['cat-1', 'cat-2']);
      }
    });

    it('should allow omitting isPrivate (database handles default)', () => {
      const input = {
        title: 'Test',
        sourceText: 'Text',
      };

      const result = insertProofreadingSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        // isPrivate is optional at Zod level - database applies default
        expect(result.data.isPrivate).toBeUndefined();
      }
    });
  });

  describe('insertAiModelSchema', () => {
    it('should validate valid model input', () => {
      const input = {
        name: 'GPT-5',
        provider: 'openai',
        modelIdentifier: 'gpt-5',
      };

      const result = insertAiModelSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should allow omitting isDefault (database handles default)', () => {
      const input = {
        name: 'Test Model',
        provider: 'anthropic',
        modelIdentifier: 'claude-test',
      };

      const result = insertAiModelSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        // isDefault is optional at Zod level - database applies default
        expect(result.data.isDefault).toBeUndefined();
      }
    });

    it('should allow omitting isActive (database handles default)', () => {
      const input = {
        name: 'Test Model',
        provider: 'anthropic',
        modelIdentifier: 'claude-test',
      };

      const result = insertAiModelSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        // isActive is optional at Zod level - database applies default
        expect(result.data.isActive).toBeUndefined();
      }
    });

    it('should reject missing provider', () => {
      const input = {
        name: 'Model',
        modelIdentifier: 'test',
      };

      const result = insertAiModelSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('insertLanguageSchema', () => {
    it('should validate valid language input', () => {
      const input = {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
      };

      const result = insertLanguageSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should reject missing code', () => {
      const input = {
        name: 'Spanish',
        nativeName: 'Español',
      };

      const result = insertLanguageSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('insertSettingSchema', () => {
    it('should validate valid setting input', () => {
      const input = {
        key: 'translation_system_prompt',
        value: 'You are a translator.',
      };

      const result = insertSettingSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should reject missing key', () => {
      const input = {
        value: 'Some value',
      };

      const result = insertSettingSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('insertTranslationFeedbackSchema', () => {
    it('should validate valid feedback input', () => {
      const input = {
        translationId: 'trans-123',
        translationOutputId: 'output-456',
        userId: 'user-789',
        selectedText: 'Hello',
        feedbackText: 'Great translation!',
        sentiment: 'positive',
      };

      const result = insertTranslationFeedbackSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should validate negative sentiment', () => {
      const input = {
        translationId: 'trans-123',
        translationOutputId: 'output-456',
        userId: 'user-789',
        selectedText: 'Hello',
        feedbackText: 'Could be better',
        sentiment: 'negative',
      };

      const result = insertTranslationFeedbackSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('insertProofreadingRuleCategorySchema', () => {
    it('should validate valid category input', () => {
      const input = {
        name: 'Grammar Rules',
        description: 'Rules for grammar checking',
      };

      const result = insertProofreadingRuleCategorySchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept category without description', () => {
      const input = {
        name: 'Quick Rules',
      };

      const result = insertProofreadingRuleCategorySchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('insertProofreadingRuleSchema', () => {
    it('should validate valid rule input', () => {
      const input = {
        categoryId: 'cat-123',
        title: 'Subject-Verb Agreement',
        ruleText: 'Ensure subjects and verbs agree in number.',
      };

      const result = insertProofreadingRuleSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should reject missing categoryId', () => {
      const input = {
        title: 'Rule',
        ruleText: 'Description',
      };

      const result = insertProofreadingRuleSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('insertImageTranslationSchema', () => {
    it('should validate valid image translation input', () => {
      const input = {
        title: 'Test Image',
        sourceImageBase64: 'base64encodeddata',
        sourceMimeType: 'image/png',
      };

      const result = insertImageTranslationSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should allow omitting isPrivate (database handles default)', () => {
      const input = {
        title: 'Test Image',
        sourceImageBase64: 'data',
        sourceMimeType: 'image/jpeg',
      };

      const result = insertImageTranslationSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        // isPrivate is optional at Zod level - database applies default
        expect(result.data.isPrivate).toBeUndefined();
      }
    });
  });

  describe('Error Messages', () => {
    it('should provide meaningful error for invalid type', () => {
      const input = {
        title: 123, // Should be string
        sourceText: 'Text',
      };

      const result = insertTranslationSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0].path).toContain('title');
      }
    });

    it('should list all validation errors', () => {
      const input = {}; // Missing all required fields

      const result = insertTranslationSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        // Should have errors for both title and sourceText
        expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
      }
    });
  });
});

