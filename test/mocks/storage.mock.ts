import { vi } from 'vitest';
import type { IStorage } from '../../server/storage';
import type {
  User,
  Translation,
  TranslationOutput,
  AiModel,
  Language,
  Setting,
  ApiKey,
  Proofreading,
  ProofreadingOutput,
  ImageTranslation,
  ImageTranslationOutput,
  ImageEdit,
  ImageEditOutput,
} from '../../shared/schema';

// Factory functions to create test data
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    profileImageUrl: null,
    isAdmin: false,
    googleAccessToken: null,
    googleRefreshToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockTranslation(overrides: Partial<Translation> = {}): Translation {
  return {
    id: 'translation-123',
    userId: 'user-123',
    title: 'Test Translation',
    sourceText: 'Hello world',
    isPrivate: false,
    selectedLanguages: null,
    lastUsedModelId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockProofreading(overrides: Partial<Proofreading> = {}): Proofreading {
  return {
    id: 'proofreading-123',
    userId: 'user-123',
    title: 'Test Proofreading',
    sourceText: 'Hello world',
    isPrivate: false,
    selectedCategories: null,
    lastUsedModelId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockImageTranslation(overrides: Partial<ImageTranslation> = {}): ImageTranslation {
  return {
    id: 'image-translation-123',
    userId: 'user-123',
    title: 'Test Image Translation',
    sourceImageBase64: 'base64data',
    sourceMimeType: 'image/png',
    isPrivate: false,
    selectedLanguages: null,
    lastUsedModelId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockImageEdit(overrides: Partial<ImageEdit> = {}): ImageEdit {
  return {
    id: 'image-edit-123',
    userId: 'user-123',
    title: 'Test Image Edit',
    sourceImageBase64: 'base64data',
    sourceMimeType: 'image/png',
    isPrivate: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Create a mock storage instance with all methods mocked
export function createMockStorage(): IStorage {
  return {
    // User operations
    getUser: vi.fn(),
    getAllUsers: vi.fn(),
    upsertUser: vi.fn(),
    updateUserRole: vi.fn(),
    updateUserGoogleTokens: vi.fn(),

    // Translation operations
    getTranslations: vi.fn(),
    getTranslationsPaginated: vi.fn(),
    getTranslation: vi.fn(),
    createTranslation: vi.fn(),
    updateTranslation: vi.fn(),
    deleteTranslation: vi.fn(),

    // Translation output operations
    getTranslationOutput: vi.fn(),
    getTranslationOutputs: vi.fn(),
    createTranslationOutput: vi.fn(),
    updateTranslationOutput: vi.fn(),
    updateTranslationOutputStatus: vi.fn(),
    updateTranslationOutputProofreadData: vi.fn(),
    deleteTranslationOutput: vi.fn(),
    deleteTranslationOutputsByTranslationId: vi.fn(),

    // AI Model operations
    getModels: vi.fn(),
    getModel: vi.fn(),
    createModel: vi.fn(),
    updateModel: vi.fn(),
    deleteModel: vi.fn(),

    // Language operations
    getLanguages: vi.fn(),
    getLanguage: vi.fn(),
    getLanguageByCode: vi.fn(),
    createLanguage: vi.fn(),
    deleteLanguage: vi.fn(),

    // Settings operations
    getSettings: vi.fn(),
    getSetting: vi.fn(),
    upsertSetting: vi.fn(),

    // API Keys operations
    getApiKey: vi.fn(),
    upsertApiKey: vi.fn(),
    getApiKeysStatus: vi.fn(),

    // Translation feedback operations
    createTranslationFeedback: vi.fn(),
    getTranslationFeedback: vi.fn(),
    getAllTranslationFeedback: vi.fn(),
    getAllTranslationFeedbackPaginated: vi.fn(),

    // Proofreading rule category operations
    getProofreadingRuleCategories: vi.fn(),
    getProofreadingRuleCategory: vi.fn(),
    createProofreadingRuleCategory: vi.fn(),
    updateProofreadingRuleCategory: vi.fn(),
    deleteProofreadingRuleCategory: vi.fn(),

    // Proofreading rule operations
    getProofreadingRules: vi.fn(),
    getProofreadingRule: vi.fn(),
    getProofreadingRulesByCategory: vi.fn(),
    getProofreadingRulesByCategoryIds: vi.fn(),
    createProofreadingRule: vi.fn(),
    updateProofreadingRule: vi.fn(),
    deleteProofreadingRule: vi.fn(),

    // Proofreading operations
    getProofreadings: vi.fn(),
    getProofreadingsPaginated: vi.fn(),
    getProofreading: vi.fn(),
    createProofreading: vi.fn(),
    updateProofreading: vi.fn(),
    deleteProofreading: vi.fn(),

    // Proofreading output operations
    getProofreadingOutput: vi.fn(),
    getProofreadingOutputByProofreadingId: vi.fn(),
    createProofreadingOutput: vi.fn(),
    updateProofreadingOutput: vi.fn(),

    // Image translation operations
    getImageTranslations: vi.fn(),
    getImageTranslationsPaginated: vi.fn(),
    getImageTranslation: vi.fn(),
    getImageTranslationMetadata: vi.fn(),
    getImageTranslationSourceImage: vi.fn(),
    createImageTranslation: vi.fn(),
    updateImageTranslation: vi.fn(),
    deleteImageTranslation: vi.fn(),

    // Image translation output operations
    getImageTranslationOutput: vi.fn(),
    getImageTranslationOutputs: vi.fn(),
    getImageTranslationOutputsMetadata: vi.fn(),
    getImageTranslationOutputImage: vi.fn(),
    createImageTranslationOutput: vi.fn(),
    updateImageTranslationOutput: vi.fn(),
    updateImageTranslationOutputStatus: vi.fn(),
    deleteImageTranslationOutput: vi.fn(),

    // Image edit operations
    getImageEditsPaginated: vi.fn(),
    getImageEdit: vi.fn(),
    getImageEditMetadata: vi.fn(),
    getImageEditSourceImage: vi.fn(),
    createImageEdit: vi.fn(),
    updateImageEdit: vi.fn(),
    deleteImageEdit: vi.fn(),

    // Image edit output operations
    getImageEditOutput: vi.fn(),
    getImageEditOutputs: vi.fn(),
    getImageEditOutputsMetadata: vi.fn(),
    getImageEditOutputImage: vi.fn(),
    createImageEditOutput: vi.fn(),
    updateImageEditOutput: vi.fn(),
    updateImageEditOutputStatus: vi.fn(),
    deleteImageEditOutput: vi.fn(),

    // Analytics operations
    getAnalyticsOverview: vi.fn(),
    getUsageOverTime: vi.fn(),
    getTopLanguages: vi.fn(),
    getProofreadingCategoryUsage: vi.fn(),
    getFeedbackSentiment: vi.fn(),
    getModelUsage: vi.fn(),
    getTopUsers: vi.fn(),
  } as unknown as IStorage;
}

