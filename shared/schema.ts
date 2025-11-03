import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  pgEnum,
  timestamp,
  varchar,
  text,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - Required for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Translation projects table
export const translations = pgTable("translations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  sourceText: text("source_text").notNull(),
  isPrivate: boolean("is_private").default(false).notNull(),
  selectedLanguages: text("selected_languages").array(),
  lastUsedModelId: varchar("last_used_model_id").references(() => aiModels.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const translationsRelations = relations(translations, ({ one, many }) => ({
  user: one(users, {
    fields: [translations.userId],
    references: [users.id],
  }),
  outputs: many(translationOutputs),
  lastUsedModel: one(aiModels, {
    fields: [translations.lastUsedModelId],
    references: [aiModels.id],
  }),
}));

export const insertTranslationSchema = createInsertSchema(translations).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTranslation = z.infer<typeof insertTranslationSchema>;
export type Translation = typeof translations.$inferSelect & {
  owner?: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
};

// Status enums for translation and proofreading
export const translationStatusEnum = pgEnum('translation_status', ['pending', 'translating', 'completed', 'failed']);
export const proofreadStatusEnum = pgEnum('proofread_status', ['pending', 'proofreading', 'completed', 'failed', 'skipped']);

// Translation outputs table (stores individual language translations)
export const translationOutputs = pgTable("translation_outputs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  translationId: varchar("translation_id").notNull().references(() => translations.id, { onDelete: 'cascade' }),
  languageCode: varchar("language_code", { length: 10 }).notNull(),
  languageName: varchar("language_name", { length: 100 }).notNull(),
  translatedText: text("translated_text"), // Nullable - can be empty during translation
  modelId: varchar("model_id").references(() => aiModels.id),
  translationStatus: translationStatusEnum("translation_status").default('pending').notNull(),
  proofreadStatus: proofreadStatusEnum("proofread_status").default('pending').notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const translationOutputsRelations = relations(translationOutputs, ({ one }) => ({
  translation: one(translations, {
    fields: [translationOutputs.translationId],
    references: [translations.id],
  }),
  model: one(aiModels, {
    fields: [translationOutputs.modelId],
    references: [aiModels.id],
  }),
}));

export const insertTranslationOutputSchema = createInsertSchema(translationOutputs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTranslationOutput = z.infer<typeof insertTranslationOutputSchema>;
export type TranslationOutput = typeof translationOutputs.$inferSelect;

// AI Models table (configurable by admin)
export const aiModels = pgTable("ai_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  provider: varchar("provider", { length: 50 }).notNull(), // 'openai' | 'anthropic'
  modelIdentifier: varchar("model_identifier", { length: 100 }).notNull(), // e.g., 'gpt-5', 'claude-sonnet-4-20250514'
  isDefault: boolean("is_default").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAiModelSchema = createInsertSchema(aiModels).omit({
  id: true,
  createdAt: true,
});

export type InsertAiModel = z.infer<typeof insertAiModelSchema>;
export type AiModel = typeof aiModels.$inferSelect;

// Languages table (configurable by admin)
export const languages = pgTable("languages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 10 }).notNull().unique(), // e.g., 'en', 'es', 'zh'
  name: varchar("name", { length: 100 }).notNull(), // e.g., 'English', 'Spanish', 'Chinese'
  nativeName: varchar("native_name", { length: 100 }).notNull(), // e.g., 'English', 'Español', '中文'
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLanguageSchema = createInsertSchema(languages).omit({
  id: true,
  createdAt: true,
});

export type InsertLanguage = z.infer<typeof insertLanguageSchema>;
export type Language = typeof languages.$inferSelect;

// Settings table (stores system-wide settings)
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;

// API Keys table (stores encrypted API keys for OpenAI and Anthropic)
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: varchar("provider", { length: 50 }).notNull().unique(), // 'openai' | 'anthropic'
  encryptedKey: text("encrypted_key").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  updatedAt: true,
});

export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
