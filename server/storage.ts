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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (REQUIRED for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(userId: string, isAdmin: boolean): Promise<User>;
  updateUserGoogleTokens(userId: string, accessToken: string, refreshToken: string): Promise<void>;

  // Translation operations
  getTranslations(userId: string): Promise<Translation[]>;
  getTranslation(id: string): Promise<Translation | undefined>;
  createTranslation(translation: InsertTranslation & { userId: string }): Promise<Translation>;
  updateTranslation(id: string, data: Partial<Translation>): Promise<Translation>;
  deleteTranslation(id: string): Promise<void>;

  // Translation output operations
  getTranslationOutput(id: string): Promise<TranslationOutput | undefined>;
  getTranslationOutputs(translationId: string): Promise<TranslationOutput[]>;
  createTranslationOutput(output: InsertTranslationOutput): Promise<TranslationOutput>;
  updateTranslationOutput(id: string, text: string): Promise<TranslationOutput>;
  updateTranslationOutputStatus(id: string, status: Partial<{ translationStatus: 'pending' | 'translating' | 'completed' | 'failed'; proofreadStatus: 'pending' | 'proofreading' | 'completed' | 'failed' | 'skipped' }>): Promise<TranslationOutput>;
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
  getApiKeysStatus(): Promise<{ openai: boolean; anthropic: boolean }>;

  // Translation feedback operations
  createTranslationFeedback(feedback: InsertTranslationFeedback): Promise<TranslationFeedback>;
  getTranslationFeedback(translationId: string): Promise<TranslationFeedback[]>;
  getAllTranslationFeedback(): Promise<TranslationFeedback[]>;
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
    status: Partial<{ translationStatus: 'pending' | 'translating' | 'completed' | 'failed'; proofreadStatus: 'pending' | 'proofreading' | 'completed' | 'failed' | 'skipped' }>
  ): Promise<TranslationOutput> {
    const [updated] = await db
      .update(translationOutputs)
      .set({ ...status, updatedAt: new Date() })
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

  async getApiKeysStatus(): Promise<{ openai: boolean; anthropic: boolean }> {
    const allKeys = await db.select().from(apiKeys);
    return {
      openai: allKeys.some(k => k.provider === 'openai'),
      anthropic: allKeys.some(k => k.provider === 'anthropic'),
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
}

export const storage = new DatabaseStorage();
