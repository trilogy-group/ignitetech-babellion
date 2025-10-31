// Reference: javascript_log_in_with_replit and javascript_database blueprints
import {
  users,
  translations,
  translationOutputs,
  aiModels,
  languages,
  settings,
  apiKeys,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (REQUIRED for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

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
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Translation operations
  async getTranslations(userId: string): Promise<Translation[]> {
    // Return all public translations + user's private translations
    return await db
      .select()
      .from(translations)
      .where(
        or(
          // Either it's public
          eq(translations.isPrivate, false),
          // OR it's the user's own translation (can be public or private)
          eq(translations.userId, userId)
        )
      )
      .orderBy(desc(translations.updatedAt));
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

  async updateTranslationOutput(id: string, text: string): Promise<TranslationOutput> {
    const [updated] = await db
      .update(translationOutputs)
      .set({ translatedText: text, updatedAt: new Date() })
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
}

export const storage = new DatabaseStorage();
