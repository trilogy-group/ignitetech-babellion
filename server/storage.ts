// Reference: javascript_log_in_with_replit and javascript_database blueprints
import {
  users,
  translations,
  translationOutputs,
  aiModels,
  languages,
  settings,
  apiKeys,
  translationFeedback,
  proofreadingRuleCategories,
  proofreadingRules,
  proofreadings,
  proofreadingOutputs,
  imageTranslations,
  imageTranslationOutputs,
  imageEdits,
  imageEditOutputs,
  type User,
  type UpsertUser,
  type Translation,
  type InsertTranslation,
  type TranslationOutput,
  type InsertTranslationOutput,
  type AiModel,
  type InsertAiModel,
  type Language,
  type InsertLanguage,
  type Setting,
  type InsertSetting,
  type ApiKey,
  type InsertApiKey,
  type TranslationFeedback,
  type InsertTranslationFeedback,
  type ProofreadingRuleCategory,
  type InsertProofreadingRuleCategory,
  type ProofreadingRule,
  type InsertProofreadingRule,
  type Proofreading,
  type InsertProofreading,
  type ProofreadingOutput,
  type InsertProofreadingOutput,
  type ImageTranslation,
  type InsertImageTranslation,
  type ImageTranslationOutput,
  type InsertImageTranslationOutput,
  type ImageEdit,
  type InsertImageEdit,
  type ImageEditOutput,
  type InsertImageEditOutput,
  type ImageEditMetadata,
  type ImageEditOutputMetadata,
  type TranslationMetadata,
  type ProofreadingMetadata,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql, inArray, ilike } from "drizzle-orm";

export interface IStorage {
  // User operations (REQUIRED for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(userId: string, isAdmin: boolean): Promise<User>;
  updateUserGoogleTokens(userId: string, accessToken: string, refreshToken: string): Promise<void>;

  // Translation operations
  getTranslations(userId: string): Promise<Translation[]>;
  getTranslationsPaginated(userId: string, page: number, limit: number, search?: string): Promise<{
    data: TranslationMetadata[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  }>;
  getTranslation(id: string): Promise<Translation | undefined>;
  createTranslation(translation: InsertTranslation & { userId: string }): Promise<Translation>;
  updateTranslation(id: string, data: Partial<Translation>): Promise<Translation>;
  deleteTranslation(id: string): Promise<void>;

  // Translation output operations
  getTranslationOutput(id: string): Promise<TranslationOutput | undefined>;
  getTranslationOutputs(translationId: string): Promise<TranslationOutput[]>;
  createTranslationOutput(output: InsertTranslationOutput): Promise<TranslationOutput>;
  updateTranslationOutput(id: string, text: string | null): Promise<TranslationOutput>;
  updateTranslationOutputStatus(id: string, status: Partial<{ translationStatus: 'pending' | 'translating' | 'completed' | 'failed'; proofreadStatus: 'pending' | 'proof_reading' | 'applying_proofread' | 'completed' | 'failed' | 'skipped' }>): Promise<TranslationOutput>;
  updateTranslationOutputProofreadData(id: string, data: { proofreadProposedChanges?: unknown; proofreadOriginalTranslation?: string | null }): Promise<TranslationOutput>;
  deleteTranslationOutput(id: string): Promise<void>;
  deleteTranslationOutputsByTranslationId(translationId: string): Promise<void>;

  // AI Model operations
  getModels(): Promise<AiModel[]>;
  getModel(id: string): Promise<AiModel | undefined>;
  createModel(model: InsertAiModel): Promise<AiModel>;
  updateModel(id: string, data: Partial<AiModel>): Promise<AiModel>;
  deleteModel(id: string): Promise<void>;

  // Language operations
  getLanguages(): Promise<Language[]>;
  getLanguage(id: string): Promise<Language | undefined>;
  getLanguageByCode(code: string): Promise<Language | undefined>;
  createLanguage(language: InsertLanguage): Promise<Language>;
  deleteLanguage(id: string): Promise<void>;

  // Settings operations
  getSettings(): Promise<Setting[]>;
  getSetting(key: string): Promise<Setting | undefined>;
  upsertSetting(setting: InsertSetting): Promise<Setting>;

  // API Keys operations
  getApiKey(provider: string): Promise<ApiKey | undefined>;
  upsertApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  getApiKeysStatus(): Promise<{ openai: boolean; anthropic: boolean; gemini: boolean }>;

  // Translation feedback operations
  createTranslationFeedback(feedback: InsertTranslationFeedback): Promise<TranslationFeedback>;
  getTranslationFeedback(translationId: string): Promise<TranslationFeedback[]>;
  getAllTranslationFeedback(): Promise<TranslationFeedback[]>;
  getAllTranslationFeedbackPaginated(page: number, limit: number): Promise<{
    data: TranslationFeedback[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>;

  // Proofreading rule category operations
  getProofreadingRuleCategories(): Promise<ProofreadingRuleCategory[]>;
  getProofreadingRuleCategory(id: string): Promise<ProofreadingRuleCategory | undefined>;
  createProofreadingRuleCategory(category: InsertProofreadingRuleCategory): Promise<ProofreadingRuleCategory>;
  updateProofreadingRuleCategory(id: string, data: Partial<ProofreadingRuleCategory>): Promise<ProofreadingRuleCategory>;
  deleteProofreadingRuleCategory(id: string): Promise<void>;

  // Proofreading rule operations
  getProofreadingRules(): Promise<ProofreadingRule[]>;
  getProofreadingRule(id: string): Promise<ProofreadingRule | undefined>;
  getProofreadingRulesByCategory(categoryId: string): Promise<ProofreadingRule[]>;
  getProofreadingRulesByCategoryIds(categoryIds: string[]): Promise<ProofreadingRule[]>;
  createProofreadingRule(rule: InsertProofreadingRule): Promise<ProofreadingRule>;
  updateProofreadingRule(id: string, data: Partial<ProofreadingRule>): Promise<ProofreadingRule>;
  deleteProofreadingRule(id: string): Promise<void>;

  // Proofreading operations
  getProofreadings(userId: string): Promise<Proofreading[]>;
  getProofreadingsPaginated(userId: string, page: number, limit: number, search?: string): Promise<{
    data: ProofreadingMetadata[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  }>;
  getProofreading(id: string): Promise<Proofreading | undefined>;
  createProofreading(proofreading: InsertProofreading & { userId: string }): Promise<Proofreading>;
  updateProofreading(id: string, data: Partial<Proofreading>): Promise<Proofreading>;
  deleteProofreading(id: string): Promise<void>;

  // Proofreading output operations
  getProofreadingOutput(id: string): Promise<ProofreadingOutput | undefined>;
  getProofreadingOutputByProofreadingId(proofreadingId: string): Promise<ProofreadingOutput | undefined>;
  createProofreadingOutput(output: InsertProofreadingOutput): Promise<ProofreadingOutput>;
  updateProofreadingOutput(id: string, data: Partial<ProofreadingOutput>): Promise<ProofreadingOutput>;

  // Image translation operations
  getImageTranslations(userId: string): Promise<Omit<ImageTranslation, 'sourceImageBase64'>[]>;
  getImageTranslationsPaginated(userId: string, page: number, limit: number, search?: string): Promise<{
    data: Omit<ImageTranslation, 'sourceImageBase64'>[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  }>;
  getImageTranslation(id: string): Promise<ImageTranslation | undefined>;
  getImageTranslationMetadata(id: string): Promise<Omit<ImageTranslation, 'sourceImageBase64'> | undefined>;
  getImageTranslationSourceImage(id: string): Promise<{ sourceImageBase64: string; sourceMimeType: string } | undefined>;
  createImageTranslation(imageTranslation: InsertImageTranslation & { userId: string }): Promise<ImageTranslation>;
  updateImageTranslation(id: string, data: Partial<ImageTranslation>): Promise<ImageTranslation>;
  deleteImageTranslation(id: string): Promise<void>;

  // Image translation output operations
  getImageTranslationOutput(id: string): Promise<ImageTranslationOutput | undefined>;
  getImageTranslationOutputs(imageTranslationId: string): Promise<ImageTranslationOutput[]>;
  getImageTranslationOutputsMetadata(imageTranslationId: string): Promise<Omit<ImageTranslationOutput, 'translatedImageBase64'>[]>;
  getImageTranslationOutputImage(outputId: string): Promise<{ translatedImageBase64: string | null; translatedMimeType: string | null } | undefined>;
  createImageTranslationOutput(output: InsertImageTranslationOutput): Promise<ImageTranslationOutput>;
  updateImageTranslationOutput(id: string, data: Partial<ImageTranslationOutput>): Promise<ImageTranslationOutput>;
  updateImageTranslationOutputStatus(id: string, status: 'pending' | 'translating' | 'completed' | 'failed'): Promise<ImageTranslationOutput>;
  deleteImageTranslationOutput(id: string): Promise<void>;

  // Image edit operations
  getImageEditsPaginated(userId: string, page: number, limit: number, search?: string): Promise<{
    data: ImageEditMetadata[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  }>;
  getImageEdit(id: string): Promise<ImageEdit | undefined>;
  getImageEditMetadata(id: string): Promise<ImageEditMetadata | undefined>;
  getImageEditSourceImage(id: string): Promise<{ sourceImageBase64: string; sourceMimeType: string } | undefined>;
  createImageEdit(imageEdit: InsertImageEdit & { userId: string }): Promise<ImageEdit>;
  updateImageEdit(id: string, data: Partial<ImageEdit>): Promise<ImageEdit>;
  deleteImageEdit(id: string): Promise<void>;

  // Image edit output operations
  getImageEditOutput(id: string): Promise<ImageEditOutput | undefined>;
  getImageEditOutputs(imageEditId: string): Promise<ImageEditOutput[]>;
  getImageEditOutputsMetadata(imageEditId: string): Promise<ImageEditOutputMetadata[]>;
  getImageEditOutputImage(outputId: string): Promise<{ editedImageBase64: string | null; editedMimeType: string | null } | undefined>;
  createImageEditOutput(output: InsertImageEditOutput): Promise<ImageEditOutput>;
  updateImageEditOutput(id: string, data: Partial<ImageEditOutput>): Promise<ImageEditOutput>;
  updateImageEditOutputStatus(id: string, status: 'pending' | 'processing' | 'completed' | 'failed'): Promise<ImageEditOutput>;
  deleteImageEditOutput(id: string): Promise<void>;

  // Analytics operations
  getAnalyticsOverview(startDate: Date): Promise<{
    totalTranslations: number;
    totalProofreadings: number;
    totalImageTranslations: number;
    activeUsers: number;
    totalFeedback: number;
  }>;
  getUsageOverTime(startDate: Date, granularity: 'day' | 'week' | 'month'): Promise<{
    date: string;
    translations: number;
    proofreadings: number;
    imageTranslations: number;
  }[]>;
  getTopLanguages(startDate: Date, limit?: number): Promise<{
    languageName: string;
    count: number;
  }[]>;
  getProofreadingCategoryUsage(startDate: Date): Promise<{
    categoryId: string;
    categoryName: string;
    count: number;
  }[]>;
  getFeedbackSentiment(startDate: Date): Promise<{
    positive: number;
    negative: number;
  }>;
  getModelUsage(startDate: Date): Promise<{
    modelId: string;
    modelName: string;
    count: number;
  }[]>;
  getTopUsers(startDate: Date, limit?: number): Promise<{
    userId: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
    translationCount: number;
    imageTranslationCount: number;
    proofreadingCount: number;
    totalCount: number;
  }[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async updateUserRole(userId: string, isAdmin: boolean): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        isAdmin,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async updateUserGoogleTokens(userId: string, accessToken: string, refreshToken: string): Promise<void> {
    await db
      .update(users)
      .set({
        googleAccessToken: accessToken,
        googleRefreshToken: refreshToken,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if user exists by email first
    if (userData.email) {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email));
      
      if (existingUser) {
        // Update existing user's profile (but keep their ID)
        const [updated] = await db
          .update(users)
          .set({
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            googleAccessToken: userData.googleAccessToken,
            googleRefreshToken: userData.googleRefreshToken,
            updatedAt: new Date(),
          })
          .where(eq(users.email, userData.email))
          .returning();
        return updated;
      }
    }
    
    // Create new user
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Translation operations
  async getTranslations(userId: string): Promise<Translation[]> {
    // Return all public translations + user's private translations with user info
    const results = await db
      .select({
        translation: translations,
        owner: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
      .from(translations)
      .leftJoin(users, eq(translations.userId, users.id))
      .where(
        or(
          // Either it's public
          eq(translations.isPrivate, false),
          // OR it's the user's own translation (can be public or private)
          eq(translations.userId, userId)
        )
      )
      .orderBy(desc(translations.updatedAt));
    
    // Map results to include owner info in the translation object
    return results.map(r => ({
      ...r.translation,
      owner: r.owner
    })) as Translation[];
  }

  async getTranslationsPaginated(
    userId: string,
    page: number = 1,
    limit: number = 20,
    search?: string
  ): Promise<{
    data: TranslationMetadata[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  }> {
    // Build base conditions
    const baseConditions = or(
      eq(translations.isPrivate, false),
      eq(translations.userId, userId)
    );

    // Add search conditions if search query provided (search title only for performance)
    const searchConditions = search && search.length >= 2
      ? and(
          baseConditions,
          ilike(translations.title, `%${search}%`)
        )
      : baseConditions;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(translations)
      .where(searchConditions);

    const total = Number(count);
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    // Get paginated results (metadata only, exclude sourceText for performance)
    const results = await db
      .select({
        id: translations.id,
        userId: translations.userId,
        title: translations.title,
        isPrivate: translations.isPrivate,
        selectedLanguages: translations.selectedLanguages,
        lastUsedModelId: translations.lastUsedModelId,
        createdAt: translations.createdAt,
        updatedAt: translations.updatedAt,
        owner: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
      .from(translations)
      .leftJoin(users, eq(translations.userId, users.id))
      .where(searchConditions)
      .orderBy(desc(translations.updatedAt))
      .limit(limit)
      .offset(offset);

    return {
      data: results.map(r => ({
        id: r.id,
        userId: r.userId,
        title: r.title,
        isPrivate: r.isPrivate,
        selectedLanguages: r.selectedLanguages,
        lastUsedModelId: r.lastUsedModelId,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        owner: r.owner
      })) as TranslationMetadata[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  async getTranslation(id: string): Promise<Translation | undefined> {
    const [translation] = await db
      .select()
      .from(translations)
      .where(eq(translations.id, id));
    return translation;
  }

  async createTranslation(translation: InsertTranslation & { userId: string }): Promise<Translation> {
    const [newTranslation] = await db
      .insert(translations)
      .values(translation)
      .returning();
    return newTranslation;
  }

  async updateTranslation(id: string, data: Partial<Translation>): Promise<Translation> {
    const [updated] = await db
      .update(translations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(translations.id, id))
      .returning();
    return updated;
  }

  async deleteTranslation(id: string): Promise<void> {
    await db.delete(translations).where(eq(translations.id, id));
  }

  // Translation output operations
  async getTranslationOutput(id: string): Promise<TranslationOutput | undefined> {
    const [output] = await db
      .select()
      .from(translationOutputs)
      .where(eq(translationOutputs.id, id));
    return output;
  }

  async getTranslationOutputs(translationId: string): Promise<TranslationOutput[]> {
    return await db
      .select()
      .from(translationOutputs)
      .where(eq(translationOutputs.translationId, translationId));
  }

  async createTranslationOutput(output: InsertTranslationOutput): Promise<TranslationOutput> {
    const [newOutput] = await db
      .insert(translationOutputs)
      .values(output)
      .returning();
    return newOutput;
  }

  async updateTranslationOutput(id: string, text: string | null): Promise<TranslationOutput> {
    const [updated] = await db
      .update(translationOutputs)
      .set({ translatedText: text, updatedAt: new Date() })
      .where(eq(translationOutputs.id, id))
      .returning();
    return updated;
  }

  async updateTranslationOutputStatus(
    id: string,
    status: Partial<{ translationStatus: 'pending' | 'translating' | 'completed' | 'failed'; proofreadStatus: 'pending' | 'proof_reading' | 'applying_proofread' | 'completed' | 'failed' | 'skipped' }>
  ): Promise<TranslationOutput> {
    const [updated] = await db
      .update(translationOutputs)
      .set({ ...status, updatedAt: new Date() })
      .where(eq(translationOutputs.id, id))
      .returning();
    return updated;
  }

  async updateTranslationOutputProofreadData(
    id: string,
    data: { proofreadProposedChanges?: unknown; proofreadOriginalTranslation?: string | null }
  ): Promise<TranslationOutput> {
    const [updated] = await db
      .update(translationOutputs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(translationOutputs.id, id))
      .returning();
    return updated;
  }

  async deleteTranslationOutput(id: string): Promise<void> {
    await db.delete(translationOutputs).where(eq(translationOutputs.id, id));
  }

  async deleteTranslationOutputsByTranslationId(translationId: string): Promise<void> {
    await db.delete(translationOutputs).where(eq(translationOutputs.translationId, translationId));
  }

  // AI Model operations
  async getModels(): Promise<AiModel[]> {
    return await db.select().from(aiModels).orderBy(aiModels.name);
  }

  async getModel(id: string): Promise<AiModel | undefined> {
    const [model] = await db.select().from(aiModels).where(eq(aiModels.id, id));
    return model;
  }

  async createModel(model: InsertAiModel): Promise<AiModel> {
    // If this model is set as default, unset all other defaults
    if (model.isDefault) {
      await db.update(aiModels).set({ isDefault: false });
    }

    const [newModel] = await db.insert(aiModels).values(model).returning();
    return newModel;
  }

  async updateModel(id: string, data: Partial<AiModel>): Promise<AiModel> {
    // If setting as default, unset all other defaults first
    if (data.isDefault) {
      await db.update(aiModels).set({ isDefault: false });
    }

    const [updated] = await db
      .update(aiModels)
      .set(data)
      .where(eq(aiModels.id, id))
      .returning();
    return updated;
  }

  async deleteModel(id: string): Promise<void> {
    await db.delete(aiModels).where(eq(aiModels.id, id));
  }

  // Language operations
  async getLanguages(): Promise<Language[]> {
    return await db.select().from(languages).orderBy(languages.name);
  }

  async getLanguage(id: string): Promise<Language | undefined> {
    const [language] = await db.select().from(languages).where(eq(languages.id, id));
    return language;
  }

  async getLanguageByCode(code: string): Promise<Language | undefined> {
    const [language] = await db.select().from(languages).where(eq(languages.code, code));
    return language;
  }

  async createLanguage(language: InsertLanguage): Promise<Language> {
    const [newLanguage] = await db.insert(languages).values(language).returning();
    return newLanguage;
  }

  async deleteLanguage(id: string): Promise<void> {
    await db.delete(languages).where(eq(languages.id, id));
  }

  // Settings operations
  async getSettings(): Promise<Setting[]> {
    return await db.select().from(settings);
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting;
  }

  async upsertSetting(setting: InsertSetting): Promise<Setting> {
    const [upserted] = await db
      .insert(settings)
      .values(setting)
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: setting.value, updatedAt: new Date() },
      })
      .returning();
    return upserted;
  }

  // API Keys operations
  async getApiKey(provider: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.provider, provider));
    return apiKey;
  }

  async upsertApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const [upserted] = await db
      .insert(apiKeys)
      .values(apiKey)
      .onConflictDoUpdate({
        target: apiKeys.provider,
        set: { encryptedKey: apiKey.encryptedKey, updatedAt: new Date() },
      })
      .returning();
    return upserted;
  }

  async getApiKeysStatus(): Promise<{ openai: boolean; anthropic: boolean; gemini: boolean }> {
    const allKeys = await db.select().from(apiKeys);
    return {
      openai: allKeys.some(k => k.provider === 'openai'),
      anthropic: allKeys.some(k => k.provider === 'anthropic'),
      gemini: allKeys.some(k => k.provider === 'gemini'),
    };
  }

  // Translation feedback operations
  async createTranslationFeedback(feedback: InsertTranslationFeedback): Promise<TranslationFeedback> {
    const [created] = await db
      .insert(translationFeedback)
      .values(feedback)
      .returning();
    return created;
  }

  async getTranslationFeedback(translationId: string): Promise<TranslationFeedback[]> {
    const results = await db
      .select({
        feedback: translationFeedback,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        },
        translation: {
          id: translations.id,
          title: translations.title,
        },
        output: {
          id: translationOutputs.id,
          languageCode: translationOutputs.languageCode,
          languageName: translationOutputs.languageName,
        },
      })
      .from(translationFeedback)
      .leftJoin(users, eq(translationFeedback.userId, users.id))
      .leftJoin(translations, eq(translationFeedback.translationId, translations.id))
      .leftJoin(translationOutputs, eq(translationFeedback.translationOutputId, translationOutputs.id))
      .where(eq(translationFeedback.translationId, translationId))
      .orderBy(desc(translationFeedback.createdAt));

    return results.map(r => ({
      ...r.feedback,
      user: r.user,
      translation: r.translation,
      output: r.output,
    })) as unknown as TranslationFeedback[];
  }

  async getAllTranslationFeedback(): Promise<TranslationFeedback[]> {
    const results = await db
      .select({
        feedback: translationFeedback,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        },
        translation: {
          id: translations.id,
          title: translations.title,
        },
        output: {
          id: translationOutputs.id,
          languageCode: translationOutputs.languageCode,
          languageName: translationOutputs.languageName,
        },
      })
      .from(translationFeedback)
      .leftJoin(users, eq(translationFeedback.userId, users.id))
      .leftJoin(translations, eq(translationFeedback.translationId, translations.id))
      .leftJoin(translationOutputs, eq(translationFeedback.translationOutputId, translationOutputs.id))
      .orderBy(desc(translationFeedback.createdAt));

    return results.map(r => ({
      ...r.feedback,
      user: r.user,
      translation: r.translation,
      output: r.output,
    })) as unknown as TranslationFeedback[];
  }

  async getAllTranslationFeedbackPaginated(page: number, limit: number): Promise<{
    data: TranslationFeedback[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(translationFeedback);
    const total = countResult[0]?.count || 0;

    // Calculate offset
    const offset = (page - 1) * limit;

    // Get paginated results with joins
    const results = await db
      .select({
        feedback: translationFeedback,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        },
        translation: {
          id: translations.id,
          title: translations.title,
        },
        output: {
          id: translationOutputs.id,
          languageCode: translationOutputs.languageCode,
          languageName: translationOutputs.languageName,
        },
      })
      .from(translationFeedback)
      .leftJoin(users, eq(translationFeedback.userId, users.id))
      .leftJoin(translations, eq(translationFeedback.translationId, translations.id))
      .leftJoin(translationOutputs, eq(translationFeedback.translationOutputId, translationOutputs.id))
      .orderBy(desc(translationFeedback.createdAt))
      .limit(limit)
      .offset(offset);

    const data = results.map(r => ({
      ...r.feedback,
      user: r.user,
      translation: r.translation,
      output: r.output,
    })) as unknown as TranslationFeedback[];

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Proofreading rule category operations
  async getProofreadingRuleCategories(): Promise<ProofreadingRuleCategory[]> {
    return await db.select().from(proofreadingRuleCategories).orderBy(proofreadingRuleCategories.name);
  }

  async getProofreadingRuleCategory(id: string): Promise<ProofreadingRuleCategory | undefined> {
    const [category] = await db.select().from(proofreadingRuleCategories).where(eq(proofreadingRuleCategories.id, id));
    return category;
  }

  async createProofreadingRuleCategory(category: InsertProofreadingRuleCategory): Promise<ProofreadingRuleCategory> {
    const [newCategory] = await db.insert(proofreadingRuleCategories).values(category).returning();
    return newCategory;
  }

  async updateProofreadingRuleCategory(id: string, data: Partial<ProofreadingRuleCategory>): Promise<ProofreadingRuleCategory> {
    const [updated] = await db
      .update(proofreadingRuleCategories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(proofreadingRuleCategories.id, id))
      .returning();
    return updated;
  }

  async deleteProofreadingRuleCategory(id: string): Promise<void> {
    await db.delete(proofreadingRuleCategories).where(eq(proofreadingRuleCategories.id, id));
  }

  // Proofreading rule operations
  async getProofreadingRules(): Promise<ProofreadingRule[]> {
    return await db.select().from(proofreadingRules).orderBy(proofreadingRules.title);
  }

  async getProofreadingRule(id: string): Promise<ProofreadingRule | undefined> {
    const [rule] = await db.select().from(proofreadingRules).where(eq(proofreadingRules.id, id));
    return rule;
  }

  async getProofreadingRulesByCategory(categoryId: string): Promise<ProofreadingRule[]> {
    return await db
      .select()
      .from(proofreadingRules)
      .where(eq(proofreadingRules.categoryId, categoryId))
      .orderBy(proofreadingRules.title);
  }

  async getProofreadingRulesByCategoryIds(categoryIds: string[]): Promise<ProofreadingRule[]> {
    if (categoryIds.length === 0) {
      return [];
    }
    return await db
      .select()
      .from(proofreadingRules)
      .where(inArray(proofreadingRules.categoryId, categoryIds))
      .orderBy(proofreadingRules.title);
  }

  async createProofreadingRule(rule: InsertProofreadingRule): Promise<ProofreadingRule> {
    const [newRule] = await db.insert(proofreadingRules).values(rule).returning();
    return newRule;
  }

  async updateProofreadingRule(id: string, data: Partial<ProofreadingRule>): Promise<ProofreadingRule> {
    const [updated] = await db
      .update(proofreadingRules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(proofreadingRules.id, id))
      .returning();
    return updated;
  }

  async deleteProofreadingRule(id: string): Promise<void> {
    await db.delete(proofreadingRules).where(eq(proofreadingRules.id, id));
  }

  // Proofreading operations
  async getProofreadings(userId: string): Promise<Proofreading[]> {
    // Return all public proofreadings + user's private proofreadings with user info
    const results = await db
      .select({
        proofreading: proofreadings,
        owner: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
      .from(proofreadings)
      .leftJoin(users, eq(proofreadings.userId, users.id))
      .where(
        or(
          // Either it's public
          eq(proofreadings.isPrivate, false),
          // OR it's the user's own proofreading (can be public or private)
          eq(proofreadings.userId, userId)
        )
      )
      .orderBy(desc(proofreadings.updatedAt));
    
    // Map results to include owner info in the proofreading object
    return results.map(r => ({
      ...r.proofreading,
      owner: r.owner
    })) as Proofreading[];
  }

  async getProofreadingsPaginated(
    userId: string,
    page: number = 1,
    limit: number = 20,
    search?: string
  ): Promise<{
    data: ProofreadingMetadata[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  }> {
    // Build base conditions
    const baseConditions = or(
      eq(proofreadings.isPrivate, false),
      eq(proofreadings.userId, userId)
    );

    // Add search conditions if search query provided (only search title for performance)
    const searchConditions = search && search.length >= 2
      ? and(
          baseConditions,
          ilike(proofreadings.title, `%${search}%`)
        )
      : baseConditions;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(proofreadings)
      .where(searchConditions);

    const total = Number(count);
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    // Get paginated results (metadata only, exclude sourceText for performance)
    const results = await db
      .select({
        id: proofreadings.id,
        userId: proofreadings.userId,
        title: proofreadings.title,
        isPrivate: proofreadings.isPrivate,
        selectedCategories: proofreadings.selectedCategories,
        lastUsedModelId: proofreadings.lastUsedModelId,
        createdAt: proofreadings.createdAt,
        updatedAt: proofreadings.updatedAt,
        owner: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
      .from(proofreadings)
      .leftJoin(users, eq(proofreadings.userId, users.id))
      .where(searchConditions)
      .orderBy(desc(proofreadings.updatedAt))
      .limit(limit)
      .offset(offset);

    return {
      data: results.map(r => ({
        id: r.id,
        userId: r.userId,
        title: r.title,
        isPrivate: r.isPrivate,
        selectedCategories: r.selectedCategories,
        lastUsedModelId: r.lastUsedModelId,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        owner: r.owner
      })) as ProofreadingMetadata[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  async getProofreading(id: string): Promise<Proofreading | undefined> {
    const [proofreading] = await db
      .select()
      .from(proofreadings)
      .where(eq(proofreadings.id, id));
    return proofreading;
  }

  async createProofreading(proofreading: InsertProofreading & { userId: string }): Promise<Proofreading> {
    const [newProofreading] = await db
      .insert(proofreadings)
      .values(proofreading)
      .returning();
    return newProofreading;
  }

  async updateProofreading(id: string, data: Partial<Proofreading>): Promise<Proofreading> {
    const [updated] = await db
      .update(proofreadings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(proofreadings.id, id))
      .returning();
    return updated;
  }

  async deleteProofreading(id: string): Promise<void> {
    await db.delete(proofreadings).where(eq(proofreadings.id, id));
  }

  // Proofreading output operations
  async getProofreadingOutput(id: string): Promise<ProofreadingOutput | undefined> {
    const [output] = await db
      .select()
      .from(proofreadingOutputs)
      .where(eq(proofreadingOutputs.id, id));
    return output;
  }

  async getProofreadingOutputByProofreadingId(proofreadingId: string): Promise<ProofreadingOutput | undefined> {
    const [output] = await db
      .select()
      .from(proofreadingOutputs)
      .where(eq(proofreadingOutputs.proofreadingId, proofreadingId))
      .orderBy(desc(proofreadingOutputs.createdAt))
      .limit(1);
    return output;
  }

  async createProofreadingOutput(output: InsertProofreadingOutput): Promise<ProofreadingOutput> {
    const [newOutput] = await db.insert(proofreadingOutputs).values(output).returning();
    return newOutput;
  }

  async updateProofreadingOutput(id: string, data: Partial<ProofreadingOutput>): Promise<ProofreadingOutput> {
    const [updated] = await db
      .update(proofreadingOutputs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(proofreadingOutputs.id, id))
      .returning();
    return updated;
  }

  // Image translation operations
  async getImageTranslations(userId: string): Promise<Omit<ImageTranslation, 'sourceImageBase64'>[]> {
    // Return all public image translations + user's private image translations with user info
    // Excludes sourceImageBase64 for performance
    const results = await db
      .select({
        imageTranslation: {
          id: imageTranslations.id,
          userId: imageTranslations.userId,
          title: imageTranslations.title,
          sourceMimeType: imageTranslations.sourceMimeType,
          isPrivate: imageTranslations.isPrivate,
          selectedLanguages: imageTranslations.selectedLanguages,
          createdAt: imageTranslations.createdAt,
          updatedAt: imageTranslations.updatedAt,
        },
        owner: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
      .from(imageTranslations)
      .leftJoin(users, eq(imageTranslations.userId, users.id))
      .where(
        or(
          eq(imageTranslations.isPrivate, false),
          eq(imageTranslations.userId, userId)
        )
      )
      .orderBy(desc(imageTranslations.updatedAt));
    
    return results.map(r => ({
      ...r.imageTranslation,
      owner: r.owner
    })) as Omit<ImageTranslation, 'sourceImageBase64'>[];
  }

  async getImageTranslationsPaginated(
    userId: string,
    page: number = 1,
    limit: number = 20,
    search?: string
  ): Promise<{
    data: Omit<ImageTranslation, 'sourceImageBase64'>[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  }> {
    // Build base conditions
    const baseConditions = or(
      eq(imageTranslations.isPrivate, false),
      eq(imageTranslations.userId, userId)
    );

    // Add search conditions if search query provided
    const searchConditions = search && search.length >= 2
      ? and(
          baseConditions,
          ilike(imageTranslations.title, `%${search}%`)
        )
      : baseConditions;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(imageTranslations)
      .where(searchConditions);

    const total = Number(count);
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    // Get paginated results - exclude sourceImageBase64 for performance
    const results = await db
      .select({
        imageTranslation: {
          id: imageTranslations.id,
          userId: imageTranslations.userId,
          title: imageTranslations.title,
          sourceMimeType: imageTranslations.sourceMimeType,
          isPrivate: imageTranslations.isPrivate,
          selectedLanguages: imageTranslations.selectedLanguages,
          createdAt: imageTranslations.createdAt,
          updatedAt: imageTranslations.updatedAt,
        },
        owner: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
      .from(imageTranslations)
      .leftJoin(users, eq(imageTranslations.userId, users.id))
      .where(searchConditions)
      .orderBy(desc(imageTranslations.updatedAt))
      .limit(limit)
      .offset(offset);

    return {
      data: results.map(r => ({
        ...r.imageTranslation,
        owner: r.owner
      })) as Omit<ImageTranslation, 'sourceImageBase64'>[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  async getImageTranslation(id: string): Promise<ImageTranslation | undefined> {
    const [imageTranslation] = await db
      .select()
      .from(imageTranslations)
      .where(eq(imageTranslations.id, id));
    return imageTranslation;
  }

  async getImageTranslationMetadata(id: string): Promise<Omit<ImageTranslation, 'sourceImageBase64'> | undefined> {
    const [result] = await db
      .select({
        id: imageTranslations.id,
        userId: imageTranslations.userId,
        title: imageTranslations.title,
        sourceMimeType: imageTranslations.sourceMimeType,
        isPrivate: imageTranslations.isPrivate,
        selectedLanguages: imageTranslations.selectedLanguages,
        lastUsedModelId: imageTranslations.lastUsedModelId,
        createdAt: imageTranslations.createdAt,
        updatedAt: imageTranslations.updatedAt,
      })
      .from(imageTranslations)
      .where(eq(imageTranslations.id, id));
    return result;
  }

  async getImageTranslationSourceImage(id: string): Promise<{ sourceImageBase64: string; sourceMimeType: string } | undefined> {
    const [result] = await db
      .select({
        sourceImageBase64: imageTranslations.sourceImageBase64,
        sourceMimeType: imageTranslations.sourceMimeType,
      })
      .from(imageTranslations)
      .where(eq(imageTranslations.id, id));
    return result;
  }

  async createImageTranslation(imageTranslation: InsertImageTranslation & { userId: string }): Promise<ImageTranslation> {
    const [newImageTranslation] = await db
      .insert(imageTranslations)
      .values(imageTranslation)
      .returning();
    return newImageTranslation;
  }

  async updateImageTranslation(id: string, data: Partial<ImageTranslation>): Promise<ImageTranslation> {
    const [updated] = await db
      .update(imageTranslations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(imageTranslations.id, id))
      .returning();
    return updated;
  }

  async deleteImageTranslation(id: string): Promise<void> {
    await db.delete(imageTranslations).where(eq(imageTranslations.id, id));
  }

  // Image translation output operations
  async getImageTranslationOutput(id: string): Promise<ImageTranslationOutput | undefined> {
    const [output] = await db
      .select()
      .from(imageTranslationOutputs)
      .where(eq(imageTranslationOutputs.id, id));
    return output;
  }

  async getImageTranslationOutputs(imageTranslationId: string): Promise<ImageTranslationOutput[]> {
    return await db
      .select()
      .from(imageTranslationOutputs)
      .where(eq(imageTranslationOutputs.imageTranslationId, imageTranslationId));
  }

  async getImageTranslationOutputsMetadata(imageTranslationId: string): Promise<Omit<ImageTranslationOutput, 'translatedImageBase64'>[]> {
    return await db
      .select({
        id: imageTranslationOutputs.id,
        imageTranslationId: imageTranslationOutputs.imageTranslationId,
        languageCode: imageTranslationOutputs.languageCode,
        languageName: imageTranslationOutputs.languageName,
        translatedMimeType: imageTranslationOutputs.translatedMimeType,
        modelId: imageTranslationOutputs.modelId,
        status: imageTranslationOutputs.status,
        createdAt: imageTranslationOutputs.createdAt,
        updatedAt: imageTranslationOutputs.updatedAt,
      })
      .from(imageTranslationOutputs)
      .where(eq(imageTranslationOutputs.imageTranslationId, imageTranslationId));
  }

  async getImageTranslationOutputImage(outputId: string): Promise<{ translatedImageBase64: string | null; translatedMimeType: string | null } | undefined> {
    const [result] = await db
      .select({
        translatedImageBase64: imageTranslationOutputs.translatedImageBase64,
        translatedMimeType: imageTranslationOutputs.translatedMimeType,
      })
      .from(imageTranslationOutputs)
      .where(eq(imageTranslationOutputs.id, outputId));
    return result;
  }

  async createImageTranslationOutput(output: InsertImageTranslationOutput): Promise<ImageTranslationOutput> {
    const [newOutput] = await db
      .insert(imageTranslationOutputs)
      .values(output)
      .returning();
    return newOutput;
  }

  async updateImageTranslationOutput(id: string, data: Partial<ImageTranslationOutput>): Promise<ImageTranslationOutput> {
    const [updated] = await db
      .update(imageTranslationOutputs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(imageTranslationOutputs.id, id))
      .returning();
    return updated;
  }

  async updateImageTranslationOutputStatus(id: string, status: 'pending' | 'translating' | 'completed' | 'failed'): Promise<ImageTranslationOutput> {
    const [updated] = await db
      .update(imageTranslationOutputs)
      .set({ status, updatedAt: new Date() })
      .where(eq(imageTranslationOutputs.id, id))
      .returning();
    return updated;
  }

  async deleteImageTranslationOutput(id: string): Promise<void> {
    await db.delete(imageTranslationOutputs).where(eq(imageTranslationOutputs.id, id));
  }

  // Image edit operations
  async getImageEditsPaginated(
    userId: string,
    page: number = 1,
    limit: number = 20,
    search?: string
  ): Promise<{
    data: ImageEditMetadata[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  }> {
    // Build base conditions - user's own edits or public edits
    const baseConditions = or(
      eq(imageEdits.isPrivate, false),
      eq(imageEdits.userId, userId)
    );

    // Add search conditions if search query provided
    const searchConditions = search && search.length >= 2
      ? and(
          baseConditions,
          ilike(imageEdits.title, `%${search}%`)
        )
      : baseConditions;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(imageEdits)
      .where(searchConditions);

    const total = Number(count);
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    // Get paginated results - exclude sourceImageBase64 for performance
    const results = await db
      .select({
        id: imageEdits.id,
        userId: imageEdits.userId,
        title: imageEdits.title,
        sourceMimeType: imageEdits.sourceMimeType,
        isPrivate: imageEdits.isPrivate,
        createdAt: imageEdits.createdAt,
        updatedAt: imageEdits.updatedAt,
        owner: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
      .from(imageEdits)
      .leftJoin(users, eq(imageEdits.userId, users.id))
      .where(searchConditions)
      .orderBy(desc(imageEdits.updatedAt))
      .limit(limit)
      .offset(offset);

    return {
      data: results.map(r => ({
        id: r.id,
        userId: r.userId,
        title: r.title,
        sourceMimeType: r.sourceMimeType,
        isPrivate: r.isPrivate,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        owner: r.owner
      })) as ImageEditMetadata[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  async getImageEdit(id: string): Promise<ImageEdit | undefined> {
    const [imageEdit] = await db
      .select()
      .from(imageEdits)
      .where(eq(imageEdits.id, id));
    return imageEdit;
  }

  async getImageEditMetadata(id: string): Promise<ImageEditMetadata | undefined> {
    const [result] = await db
      .select({
        id: imageEdits.id,
        userId: imageEdits.userId,
        title: imageEdits.title,
        sourceMimeType: imageEdits.sourceMimeType,
        isPrivate: imageEdits.isPrivate,
        createdAt: imageEdits.createdAt,
        updatedAt: imageEdits.updatedAt,
      })
      .from(imageEdits)
      .where(eq(imageEdits.id, id));
    return result;
  }

  async getImageEditSourceImage(id: string): Promise<{ sourceImageBase64: string; sourceMimeType: string } | undefined> {
    const [result] = await db
      .select({
        sourceImageBase64: imageEdits.sourceImageBase64,
        sourceMimeType: imageEdits.sourceMimeType,
      })
      .from(imageEdits)
      .where(eq(imageEdits.id, id));
    return result;
  }

  async createImageEdit(imageEdit: InsertImageEdit & { userId: string }): Promise<ImageEdit> {
    const [newImageEdit] = await db
      .insert(imageEdits)
      .values(imageEdit)
      .returning();
    return newImageEdit;
  }

  async updateImageEdit(id: string, data: Partial<ImageEdit>): Promise<ImageEdit> {
    const [updated] = await db
      .update(imageEdits)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(imageEdits.id, id))
      .returning();
    return updated;
  }

  async deleteImageEdit(id: string): Promise<void> {
    await db.delete(imageEdits).where(eq(imageEdits.id, id));
  }

  // Image edit output operations
  async getImageEditOutput(id: string): Promise<ImageEditOutput | undefined> {
    const [output] = await db
      .select()
      .from(imageEditOutputs)
      .where(eq(imageEditOutputs.id, id));
    return output;
  }

  async getImageEditOutputs(imageEditId: string): Promise<ImageEditOutput[]> {
    return await db
      .select()
      .from(imageEditOutputs)
      .where(eq(imageEditOutputs.imageEditId, imageEditId))
      .orderBy(desc(imageEditOutputs.createdAt));
  }

  async getImageEditOutputsMetadata(imageEditId: string): Promise<ImageEditOutputMetadata[]> {
    return await db
      .select({
        id: imageEditOutputs.id,
        imageEditId: imageEditOutputs.imageEditId,
        prompt: imageEditOutputs.prompt,
        editedMimeType: imageEditOutputs.editedMimeType,
        model: imageEditOutputs.model,
        status: imageEditOutputs.status,
        createdAt: imageEditOutputs.createdAt,
        updatedAt: imageEditOutputs.updatedAt,
      })
      .from(imageEditOutputs)
      .where(eq(imageEditOutputs.imageEditId, imageEditId))
      .orderBy(desc(imageEditOutputs.createdAt));
  }

  async getImageEditOutputImage(outputId: string): Promise<{ editedImageBase64: string | null; editedMimeType: string | null } | undefined> {
    const [result] = await db
      .select({
        editedImageBase64: imageEditOutputs.editedImageBase64,
        editedMimeType: imageEditOutputs.editedMimeType,
      })
      .from(imageEditOutputs)
      .where(eq(imageEditOutputs.id, outputId));
    return result;
  }

  async createImageEditOutput(output: InsertImageEditOutput): Promise<ImageEditOutput> {
    const [newOutput] = await db
      .insert(imageEditOutputs)
      .values(output)
      .returning();
    return newOutput;
  }

  async updateImageEditOutput(id: string, data: Partial<ImageEditOutput>): Promise<ImageEditOutput> {
    const [updated] = await db
      .update(imageEditOutputs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(imageEditOutputs.id, id))
      .returning();
    return updated;
  }

  async updateImageEditOutputStatus(id: string, status: 'pending' | 'processing' | 'completed' | 'failed'): Promise<ImageEditOutput> {
    const [updated] = await db
      .update(imageEditOutputs)
      .set({ status, updatedAt: new Date() })
      .where(eq(imageEditOutputs.id, id))
      .returning();
    return updated;
  }

  async deleteImageEditOutput(id: string): Promise<void> {
    await db.delete(imageEditOutputs).where(eq(imageEditOutputs.id, id));
  }

  // Analytics operations
  async getAnalyticsOverview(startDate: Date): Promise<{
    totalTranslations: number;
    totalProofreadings: number;
    totalImageTranslations: number;
    activeUsers: number;
    totalFeedback: number;
  }> {
    // Get total translations in period
    const [translationsCount] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(translations)
      .where(sql`${translations.createdAt} >= ${startDate}`);

    // Get total proofreadings in period
    const [proofreadingsCount] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(proofreadings)
      .where(sql`${proofreadings.createdAt} >= ${startDate}`);

    // Get total image translations in period
    const [imageTranslationsCount] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(imageTranslations)
      .where(sql`${imageTranslations.createdAt} >= ${startDate}`);

    // Get unique active users (who created translations or proofreadings)
    const activeUsersResult = await db
      .select({ userId: translations.userId })
      .from(translations)
      .where(sql`${translations.createdAt} >= ${startDate}`)
      .union(
        db.select({ userId: proofreadings.userId })
          .from(proofreadings)
          .where(sql`${proofreadings.createdAt} >= ${startDate}`)
      )
      .union(
        db.select({ userId: imageTranslations.userId })
          .from(imageTranslations)
          .where(sql`${imageTranslations.createdAt} >= ${startDate}`)
      );
    const uniqueUserIds = new Set(activeUsersResult.map(r => r.userId));

    // Get total feedback in period
    const [feedbackCount] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(translationFeedback)
      .where(sql`${translationFeedback.createdAt} >= ${startDate}`);

    return {
      totalTranslations: translationsCount?.count || 0,
      totalProofreadings: proofreadingsCount?.count || 0,
      totalImageTranslations: imageTranslationsCount?.count || 0,
      activeUsers: uniqueUserIds.size,
      totalFeedback: feedbackCount?.count || 0,
    };
  }

  async getUsageOverTime(startDate: Date, granularity: 'day' | 'week' | 'month'): Promise<{
    date: string;
    translations: number;
    proofreadings: number;
    imageTranslations: number;
  }[]> {
    // Determine date truncation based on granularity
    const dateTrunc = granularity === 'day' ? 'day' : granularity === 'week' ? 'week' : 'month';

    // Get translations grouped by period
    const translationsData = await db
      .select({
        date: sql<string>`date_trunc('${sql.raw(dateTrunc)}', ${translations.createdAt})::date::text`,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(translations)
      .where(sql`${translations.createdAt} >= ${startDate}`)
      .groupBy(sql`date_trunc('${sql.raw(dateTrunc)}', ${translations.createdAt})`)
      .orderBy(sql`date_trunc('${sql.raw(dateTrunc)}', ${translations.createdAt})`);

    // Get proofreadings grouped by period
    const proofreadingsData = await db
      .select({
        date: sql<string>`date_trunc('${sql.raw(dateTrunc)}', ${proofreadings.createdAt})::date::text`,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(proofreadings)
      .where(sql`${proofreadings.createdAt} >= ${startDate}`)
      .groupBy(sql`date_trunc('${sql.raw(dateTrunc)}', ${proofreadings.createdAt})`)
      .orderBy(sql`date_trunc('${sql.raw(dateTrunc)}', ${proofreadings.createdAt})`);

    // Get image translations grouped by period
    const imageTranslationsData = await db
      .select({
        date: sql<string>`date_trunc('${sql.raw(dateTrunc)}', ${imageTranslations.createdAt})::date::text`,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(imageTranslations)
      .where(sql`${imageTranslations.createdAt} >= ${startDate}`)
      .groupBy(sql`date_trunc('${sql.raw(dateTrunc)}', ${imageTranslations.createdAt})`)
      .orderBy(sql`date_trunc('${sql.raw(dateTrunc)}', ${imageTranslations.createdAt})`);

    // Merge data by date
    const dateMap = new Map<string, { translations: number; proofreadings: number; imageTranslations: number }>();

    for (const row of translationsData) {
      const existing = dateMap.get(row.date) || { translations: 0, proofreadings: 0, imageTranslations: 0 };
      existing.translations = row.count;
      dateMap.set(row.date, existing);
    }

    for (const row of proofreadingsData) {
      const existing = dateMap.get(row.date) || { translations: 0, proofreadings: 0, imageTranslations: 0 };
      existing.proofreadings = row.count;
      dateMap.set(row.date, existing);
    }

    for (const row of imageTranslationsData) {
      const existing = dateMap.get(row.date) || { translations: 0, proofreadings: 0, imageTranslations: 0 };
      existing.imageTranslations = row.count;
      dateMap.set(row.date, existing);
    }

    // Convert to sorted array
    return Array.from(dateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({
        date,
        translations: data.translations,
        proofreadings: data.proofreadings,
        imageTranslations: data.imageTranslations,
      }));
  }

  async getTopLanguages(startDate: Date, limit: number = 10): Promise<{
    languageName: string;
    count: number;
  }[]> {
    // Get text translation language counts
    const textLanguages = await db
      .select({
        languageName: translationOutputs.languageName,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(translationOutputs)
      .innerJoin(translations, eq(translationOutputs.translationId, translations.id))
      .where(sql`${translations.createdAt} >= ${startDate}`)
      .groupBy(translationOutputs.languageName);

    // Get image translation language counts
    const imageLanguages = await db
      .select({
        languageName: imageTranslationOutputs.languageName,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(imageTranslationOutputs)
      .innerJoin(imageTranslations, eq(imageTranslationOutputs.imageTranslationId, imageTranslations.id))
      .where(sql`${imageTranslations.createdAt} >= ${startDate}`)
      .groupBy(imageTranslationOutputs.languageName);

    // Merge counts by language name
    const languageMap = new Map<string, number>();
    for (const row of textLanguages) {
      const existing = languageMap.get(row.languageName) || 0;
      languageMap.set(row.languageName, existing + row.count);
    }
    for (const row of imageLanguages) {
      const existing = languageMap.get(row.languageName) || 0;
      languageMap.set(row.languageName, existing + row.count);
    }

    // Sort by count and return top N
    return Array.from(languageMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([languageName, count]) => ({ languageName, count }));
  }

  async getProofreadingCategoryUsage(startDate: Date): Promise<{
    categoryId: string;
    categoryName: string;
    count: number;
  }[]> {
    // Get all proofreadings with their selected categories
    const proofreadingRecords = await db
      .select({
        selectedCategories: proofreadings.selectedCategories,
      })
      .from(proofreadings)
      .where(sql`${proofreadings.createdAt} >= ${startDate}`);

    // Count category usage
    const categoryCountMap = new Map<string, number>();
    for (const record of proofreadingRecords) {
      const categories = record.selectedCategories || [];
      for (const categoryId of categories) {
        const existing = categoryCountMap.get(categoryId) || 0;
        categoryCountMap.set(categoryId, existing + 1);
      }
    }

    // Get category names
    const allCategories = await db.select().from(proofreadingRuleCategories);
    const categoryNameMap = new Map(allCategories.map(c => [c.id, c.name]));

    // Build result with names
    return Array.from(categoryCountMap.entries())
      .map(([categoryId, count]) => ({
        categoryId,
        categoryName: categoryNameMap.get(categoryId) || 'Unknown',
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }

  async getFeedbackSentiment(startDate: Date): Promise<{
    positive: number;
    negative: number;
  }> {
    const sentimentData = await db
      .select({
        sentiment: translationFeedback.sentiment,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(translationFeedback)
      .where(sql`${translationFeedback.createdAt} >= ${startDate}`)
      .groupBy(translationFeedback.sentiment);

    const result = { positive: 0, negative: 0 };
    for (const row of sentimentData) {
      if (row.sentiment === 'positive') {
        result.positive = row.count;
      } else if (row.sentiment === 'negative') {
        result.negative = row.count;
      }
    }
    return result;
  }

  async getModelUsage(startDate: Date): Promise<{
    modelId: string;
    modelName: string;
    count: number;
  }[]> {
    // Get translation output model usage
    const translationModelUsage = await db
      .select({
        modelId: translationOutputs.modelId,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(translationOutputs)
      .innerJoin(translations, eq(translationOutputs.translationId, translations.id))
      .where(and(
        sql`${translations.createdAt} >= ${startDate}`,
        sql`${translationOutputs.modelId} IS NOT NULL`
      ))
      .groupBy(translationOutputs.modelId);

    // Get proofreading output model usage
    const proofreadingModelUsage = await db
      .select({
        modelId: proofreadingOutputs.modelId,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(proofreadingOutputs)
      .innerJoin(proofreadings, eq(proofreadingOutputs.proofreadingId, proofreadings.id))
      .where(and(
        sql`${proofreadings.createdAt} >= ${startDate}`,
        sql`${proofreadingOutputs.modelId} IS NOT NULL`
      ))
      .groupBy(proofreadingOutputs.modelId);

    // Merge counts by model
    const modelCountMap = new Map<string, number>();
    for (const row of translationModelUsage) {
      if (row.modelId) {
        const existing = modelCountMap.get(row.modelId) || 0;
        modelCountMap.set(row.modelId, existing + row.count);
      }
    }
    for (const row of proofreadingModelUsage) {
      if (row.modelId) {
        const existing = modelCountMap.get(row.modelId) || 0;
        modelCountMap.set(row.modelId, existing + row.count);
      }
    }

    // Get model names
    const allModels = await db.select().from(aiModels);
    const modelNameMap = new Map(allModels.map(m => [m.id, m.name]));

    // Build result with names
    return Array.from(modelCountMap.entries())
      .map(([modelId, count]) => ({
        modelId,
        modelName: modelNameMap.get(modelId) || 'Unknown',
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }

  async getTopUsers(startDate: Date, limit: number = 10): Promise<{
    userId: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
    translationCount: number;
    imageTranslationCount: number;
    proofreadingCount: number;
    totalCount: number;
  }[]> {
    // Get translation counts per user
    const translationCounts = await db
      .select({
        userId: translations.userId,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(translations)
      .where(sql`${translations.createdAt} >= ${startDate}`)
      .groupBy(translations.userId);

    // Get proofreading counts per user
    const proofreadingCounts = await db
      .select({
        userId: proofreadings.userId,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(proofreadings)
      .where(sql`${proofreadings.createdAt} >= ${startDate}`)
      .groupBy(proofreadings.userId);

    // Get image translation counts per user
    const imageTranslationCounts = await db
      .select({
        userId: imageTranslations.userId,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(imageTranslations)
      .where(sql`${imageTranslations.createdAt} >= ${startDate}`)
      .groupBy(imageTranslations.userId);

    // Merge counts
    const userCountMap = new Map<string, { translationCount: number; imageTranslationCount: number; proofreadingCount: number }>();
    for (const row of translationCounts) {
      const existing = userCountMap.get(row.userId) || { translationCount: 0, imageTranslationCount: 0, proofreadingCount: 0 };
      existing.translationCount += row.count;
      userCountMap.set(row.userId, existing);
    }
    for (const row of imageTranslationCounts) {
      const existing = userCountMap.get(row.userId) || { translationCount: 0, imageTranslationCount: 0, proofreadingCount: 0 };
      existing.imageTranslationCount += row.count;
      userCountMap.set(row.userId, existing);
    }
    for (const row of proofreadingCounts) {
      const existing = userCountMap.get(row.userId) || { translationCount: 0, imageTranslationCount: 0, proofreadingCount: 0 };
      existing.proofreadingCount += row.count;
      userCountMap.set(row.userId, existing);
    }

    // Get user details
    const userIds = Array.from(userCountMap.keys());
    if (userIds.length === 0) return [];

    const userDetails = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
      })
      .from(users)
      .where(inArray(users.id, userIds));

    const userDetailsMap = new Map(userDetails.map(u => [u.id, u]));

    // Build result and sort by total count
    return Array.from(userCountMap.entries())
      .map(([userId, counts]) => {
        const user = userDetailsMap.get(userId);
        return {
          userId,
          email: user?.email ?? null,
          firstName: user?.firstName ?? null,
          lastName: user?.lastName ?? null,
          profileImageUrl: user?.profileImageUrl ?? null,
          translationCount: counts.translationCount,
          imageTranslationCount: counts.imageTranslationCount,
          proofreadingCount: counts.proofreadingCount,
          totalCount: counts.translationCount + counts.imageTranslationCount + counts.proofreadingCount,
        };
      })
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, limit);
  }
}

export const storage = new DatabaseStorage();
