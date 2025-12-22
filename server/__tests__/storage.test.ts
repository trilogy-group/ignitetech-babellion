import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { IStorage } from '../storage';

/**
 * Storage Layer Tests
 * 
 * These tests verify the storage interface contract and data integrity patterns.
 * We test against a mock implementation to isolate storage logic from database.
 */

// Mock the database module
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../db', () => ({
  db: mockDb,
}));

// Helper to create chainable mock
function createChainableMock(finalResult: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.leftJoin = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.offset = vi.fn(() => chain);
  chain.values = vi.fn(() => chain);
  chain.set = vi.fn(() => chain);
  chain.onConflictDoUpdate = vi.fn(() => chain);
  chain.returning = vi.fn(() => Promise.resolve(finalResult));
  chain.then = vi.fn((resolve) => Promise.resolve(finalResult).then(resolve));
  return chain;
}

describe('Storage Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User Operations', () => {
    describe('getUser', () => {
      it('should return user when found', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          isAdmin: false,
        };

        const chain = createChainableMock([mockUser]);
        mockDb.select.mockReturnValue(chain);

        // Import after mocking
        const { storage } = await import('../storage');
        const user = await storage.getUser('user-123');

        expect(user).toEqual(mockUser);
        expect(mockDb.select).toHaveBeenCalled();
      });

      it('should return undefined when user not found', async () => {
        const chain = createChainableMock([]);
        mockDb.select.mockReturnValue(chain);

        const { storage } = await import('../storage');
        const user = await storage.getUser('nonexistent');

        expect(user).toBeUndefined();
      });
    });

    describe('upsertUser', () => {
      it('should create new user when email not found', async () => {
        const newUser = {
          email: 'new@example.com',
          firstName: 'New',
          lastName: 'User',
        };

        const createdUser = { id: 'new-id', ...newUser, isAdmin: false };

        // First call: select to check if exists
        const selectChain = createChainableMock([]);
        mockDb.select.mockReturnValue(selectChain);

        // Second call: insert
        const insertChain = createChainableMock([createdUser]);
        mockDb.insert.mockReturnValue(insertChain);

        const { storage } = await import('../storage');
        const user = await storage.upsertUser(newUser);

        expect(user).toEqual(createdUser);
      });

      it('should update existing user when email found', async () => {
        const existingUser = {
          id: 'existing-id',
          email: 'existing@example.com',
          firstName: 'Old',
          lastName: 'Name',
          isAdmin: true,
        };

        const updateData = {
          email: 'existing@example.com',
          firstName: 'New',
          lastName: 'Name',
        };

        const updatedUser = { ...existingUser, ...updateData };

        // First call: select finds existing
        const selectChain = createChainableMock([existingUser]);
        mockDb.select.mockReturnValue(selectChain);

        // Second call: update
        const updateChain = createChainableMock([updatedUser]);
        mockDb.update.mockReturnValue(updateChain);

        const { storage } = await import('../storage');
        const user = await storage.upsertUser(updateData);

        expect(user).toEqual(updatedUser);
      });
    });

    describe('updateUserRole', () => {
      it('should update user admin status', async () => {
        const updatedUser = {
          id: 'user-123',
          email: 'test@example.com',
          isAdmin: true,
        };

        const updateChain = createChainableMock([updatedUser]);
        mockDb.update.mockReturnValue(updateChain);

        const { storage } = await import('../storage');
        const user = await storage.updateUserRole('user-123', true);

        expect(user.isAdmin).toBe(true);
      });
    });
  });

  describe('Translation Operations', () => {
    describe('createTranslation', () => {
      it('should create translation with userId', async () => {
        const translationData = {
          userId: 'user-123',
          title: 'Test Translation',
          sourceText: 'Hello world',
        };

        const createdTranslation = {
          id: 'trans-123',
          ...translationData,
          isPrivate: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const insertChain = createChainableMock([createdTranslation]);
        mockDb.insert.mockReturnValue(insertChain);

        const { storage } = await import('../storage');
        const translation = await storage.createTranslation(translationData);

        expect(translation.id).toBe('trans-123');
        expect(translation.userId).toBe('user-123');
        expect(translation.title).toBe('Test Translation');
      });
    });

    describe('getTranslation', () => {
      it('should return translation when found', async () => {
        const mockTranslation = {
          id: 'trans-123',
          userId: 'user-123',
          title: 'Test',
          sourceText: 'Hello',
          isPrivate: false,
        };

        const chain = createChainableMock([{ translation: mockTranslation, owner: null }]);
        mockDb.select.mockReturnValue(chain);

        const { storage } = await import('../storage');
        const translation = await storage.getTranslation('trans-123');

        expect(translation).toBeDefined();
      });
    });

    describe('deleteTranslation', () => {
      it('should delete translation by id', async () => {
        const deleteChain = createChainableMock(undefined);
        mockDb.delete.mockReturnValue(deleteChain);

        const { storage } = await import('../storage');
        await storage.deleteTranslation('trans-123');

        expect(mockDb.delete).toHaveBeenCalled();
      });
    });
  });

  describe('Translation Output Operations', () => {
    describe('createTranslationOutput', () => {
      it('should create output with pending status', async () => {
        const outputData = {
          translationId: 'trans-123',
          languageCode: 'es',
          languageName: 'Spanish',
        };

        const createdOutput = {
          id: 'output-123',
          ...outputData,
          translationStatus: 'pending',
          proofreadStatus: 'pending',
        };

        const insertChain = createChainableMock([createdOutput]);
        mockDb.insert.mockReturnValue(insertChain);

        const { storage } = await import('../storage');
        const output = await storage.createTranslationOutput(outputData);

        expect(output.translationStatus).toBe('pending');
      });
    });

    describe('updateTranslationOutputStatus', () => {
      it('should update translation status', async () => {
        const updatedOutput = {
          id: 'output-123',
          translationStatus: 'completed',
        };

        const updateChain = createChainableMock([updatedOutput]);
        mockDb.update.mockReturnValue(updateChain);

        const { storage } = await import('../storage');
        const output = await storage.updateTranslationOutputStatus('output-123', {
          translationStatus: 'completed',
        });

        expect(output.translationStatus).toBe('completed');
      });
    });
  });

  describe('AI Model Operations', () => {
    describe('getModels', () => {
      it('should return all models ordered by name', async () => {
        const mockModels = [
          { id: 'model-1', name: 'GPT-4', provider: 'openai' },
          { id: 'model-2', name: 'Claude', provider: 'anthropic' },
        ];

        const chain = createChainableMock(mockModels);
        mockDb.select.mockReturnValue(chain);

        const { storage } = await import('../storage');
        const models = await storage.getModels();

        expect(models).toHaveLength(2);
      });
    });

    describe('createModel', () => {
      it('should create model with defaults', async () => {
        const modelData = {
          name: 'New Model',
          provider: 'openai',
          modelIdentifier: 'gpt-new',
        };

        const createdModel = {
          id: 'model-new',
          ...modelData,
          isDefault: false,
          isActive: true,
        };

        const insertChain = createChainableMock([createdModel]);
        mockDb.insert.mockReturnValue(insertChain);

        const { storage } = await import('../storage');
        const model = await storage.createModel(modelData);

        expect(model.id).toBe('model-new');
      });
    });
  });

  describe('API Key Operations', () => {
    describe('getApiKey', () => {
      it('should return API key for provider', async () => {
        const mockApiKey = {
          id: 'key-123',
          provider: 'openai',
          encryptedKey: 'encrypted-value',
        };

        const chain = createChainableMock([mockApiKey]);
        mockDb.select.mockReturnValue(chain);

        const { storage } = await import('../storage');
        const apiKey = await storage.getApiKey('openai');

        expect(apiKey?.provider).toBe('openai');
      });

      it('should return undefined when provider key not found', async () => {
        const chain = createChainableMock([]);
        mockDb.select.mockReturnValue(chain);

        const { storage } = await import('../storage');
        const apiKey = await storage.getApiKey('unknown');

        expect(apiKey).toBeUndefined();
      });
    });

    describe('upsertApiKey', () => {
      it('should insert or update API key', async () => {
        const keyData = {
          provider: 'openai',
          encryptedKey: 'new-encrypted-key',
        };

        const upsertedKey = {
          id: 'key-123',
          ...keyData,
        };

        const insertChain = createChainableMock([upsertedKey]);
        mockDb.insert.mockReturnValue(insertChain);

        const { storage } = await import('../storage');
        const apiKey = await storage.upsertApiKey(keyData);

        expect(apiKey.encryptedKey).toBe('new-encrypted-key');
      });
    });
  });

  describe('Settings Operations', () => {
    describe('getSetting', () => {
      it('should return setting by key', async () => {
        const mockSetting = {
          id: 'setting-1',
          key: 'translation_prompt',
          value: 'You are a translator',
        };

        const chain = createChainableMock([mockSetting]);
        mockDb.select.mockReturnValue(chain);

        const { storage } = await import('../storage');
        const setting = await storage.getSetting('translation_prompt');

        expect(setting?.value).toBe('You are a translator');
      });
    });

    describe('upsertSetting', () => {
      it('should insert or update setting', async () => {
        const settingData = {
          key: 'new_setting',
          value: 'new value',
        };

        const upsertedSetting = {
          id: 'setting-new',
          ...settingData,
        };

        const insertChain = createChainableMock([upsertedSetting]);
        mockDb.insert.mockReturnValue(insertChain);

        const { storage } = await import('../storage');
        const setting = await storage.upsertSetting(settingData);

        expect(setting.key).toBe('new_setting');
      });
    });
  });

  describe('Proofreading Operations', () => {
    describe('createProofreading', () => {
      it('should create proofreading with userId', async () => {
        const proofreadingData = {
          userId: 'user-123',
          title: 'Test Proofreading',
          sourceText: 'Check this text',
        };

        const createdProofreading = {
          id: 'proof-123',
          ...proofreadingData,
          isPrivate: false,
        };

        const insertChain = createChainableMock([createdProofreading]);
        mockDb.insert.mockReturnValue(insertChain);

        const { storage } = await import('../storage');
        const proofreading = await storage.createProofreading(proofreadingData);

        expect(proofreading.id).toBe('proof-123');
      });
    });

    describe('getProofreadingRulesByCategoryIds', () => {
      it('should return rules for multiple categories', async () => {
        const mockRules = [
          { id: 'rule-1', categoryId: 'cat-1', title: 'Rule 1' },
          { id: 'rule-2', categoryId: 'cat-2', title: 'Rule 2' },
        ];

        const chain = createChainableMock(mockRules);
        mockDb.select.mockReturnValue(chain);

        const { storage } = await import('../storage');
        const rules = await storage.getProofreadingRulesByCategoryIds(['cat-1', 'cat-2']);

        expect(rules).toHaveLength(2);
      });

      it('should return empty array for empty category list', async () => {
        const { storage } = await import('../storage');
        const rules = await storage.getProofreadingRulesByCategoryIds([]);

        expect(rules).toEqual([]);
      });
    });
  });

  describe('Image Operations', () => {
    describe('createImageTranslation', () => {
      it('should create image translation', async () => {
        const imageData = {
          userId: 'user-123',
          title: 'Test Image',
          sourceImageBase64: 'base64data',
          sourceMimeType: 'image/png',
        };

        const createdImage = {
          id: 'img-123',
          ...imageData,
          isPrivate: false,
        };

        const insertChain = createChainableMock([createdImage]);
        mockDb.insert.mockReturnValue(insertChain);

        const { storage } = await import('../storage');
        const image = await storage.createImageTranslation(imageData);

        expect(image.id).toBe('img-123');
      });
    });

    describe('createImageEdit', () => {
      it('should create image edit', async () => {
        const editData = {
          userId: 'user-123',
          title: 'Test Edit',
          sourceImageBase64: 'base64data',
          sourceMimeType: 'image/png',
        };

        const createdEdit = {
          id: 'edit-123',
          ...editData,
          isPrivate: false,
        };

        const insertChain = createChainableMock([createdEdit]);
        mockDb.insert.mockReturnValue(insertChain);

        const { storage } = await import('../storage');
        const edit = await storage.createImageEdit(editData);

        expect(edit.id).toBe('edit-123');
      });
    });
  });

  describe('Pagination', () => {
    describe('getTranslationsPaginated', () => {
      it('should return paginated results with metadata', async () => {
        const mockTranslations = [
          { id: 'trans-1', title: 'Translation 1' },
          { id: 'trans-2', title: 'Translation 2' },
        ];

        // Mock count query
        const countChain = createChainableMock([{ count: 10 }]);
        mockDb.select.mockReturnValueOnce(countChain);

        // Mock data query
        const dataChain = createChainableMock(mockTranslations.map(t => ({
          ...t,
          owner: { id: 'user-1', email: 'test@test.com', firstName: 'Test', lastName: 'User' }
        })));
        mockDb.select.mockReturnValueOnce(dataChain);

        const { storage } = await import('../storage');
        const result = await storage.getTranslationsPaginated('user-123', 1, 2);

        expect(result.pagination.total).toBe(10);
        expect(result.pagination.page).toBe(1);
        expect(result.pagination.limit).toBe(2);
        expect(result.pagination.totalPages).toBe(5);
      });
    });
  });

  describe('Feedback Operations', () => {
    describe('createTranslationFeedback', () => {
      it('should create feedback entry', async () => {
        const feedbackData = {
          translationId: 'trans-123',
          translationOutputId: 'output-123',
          userId: 'user-123',
          selectedText: 'Hello',
          feedbackText: 'Great translation!',
          sentiment: 'positive' as const,
        };

        const createdFeedback = {
          id: 'feedback-123',
          ...feedbackData,
        };

        const insertChain = createChainableMock([createdFeedback]);
        mockDb.insert.mockReturnValue(insertChain);

        const { storage } = await import('../storage');
        const feedback = await storage.createTranslationFeedback(feedbackData);

        expect(feedback.sentiment).toBe('positive');
      });
    });
  });
});

