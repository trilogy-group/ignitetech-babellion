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

// Metadata type for sidebar - excludes sourceText for performance
export type TranslationMetadata = Omit<Translation, 'sourceText'>;

// Status enums for translation and proofreading
export const translationStatusEnum = pgEnum('translation_status', ['pending', 'translating', 'completed', 'failed']);
export const proofreadStatusEnum = pgEnum('proofread_status', ['pending', 'proof_reading', 'applying_proofread', 'completed', 'failed', 'skipped']);

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
  proofreadProposedChanges: jsonb("proofread_proposed_changes"), // Stores bullet-point list of proposed changes from Step 1
  proofreadOriginalTranslation: text("proofread_original_translation"), // Stores pre-proofread translation for reference
  // Performance metrics (only set on successful completion)
  translationDurationMs: integer("translation_duration_ms"), // Time to complete translation in milliseconds
  translationOutputTokens: integer("translation_output_tokens"), // Output tokens used for translation
  proofreadDurationMs: integer("proofread_duration_ms"), // Time to complete proofreading in milliseconds
  proofreadOutputTokens: integer("proofread_output_tokens"), // Output tokens used for proofreading
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

// Feedback sentiment enum
export const feedbackSentimentEnum = pgEnum('feedback_sentiment', ['positive', 'negative']);

// Translation Feedback table (stores user feedback on translations)
export const translationFeedback = pgTable("translation_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  translationId: varchar("translation_id").notNull().references(() => translations.id, { onDelete: 'cascade' }),
  translationOutputId: varchar("translation_output_id").notNull().references(() => translationOutputs.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  selectedText: text("selected_text").notNull(),
  feedbackText: text("feedback_text").notNull(),
  sentiment: feedbackSentimentEnum("sentiment").notNull(), // thumbs up or down
  modelUsed: varchar("model_used", { length: 100 }), // Store model identifier at feedback time
  createdAt: timestamp("created_at").defaultNow(),
});

export const translationFeedbackRelations = relations(translationFeedback, ({ one }) => ({
  translation: one(translations, {
    fields: [translationFeedback.translationId],
    references: [translations.id],
  }),
  translationOutput: one(translationOutputs, {
    fields: [translationFeedback.translationOutputId],
    references: [translationOutputs.id],
  }),
  user: one(users, {
    fields: [translationFeedback.userId],
    references: [users.id],
  }),
}));

export const insertTranslationFeedbackSchema = createInsertSchema(translationFeedback).omit({
  id: true,
  createdAt: true,
});

export type InsertTranslationFeedback = z.infer<typeof insertTranslationFeedbackSchema>;
export type TranslationFeedback = typeof translationFeedback.$inferSelect;

// Proofreading Rule Categories table
export const proofreadingRuleCategories = pgTable("proofreading_rule_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProofreadingRuleCategorySchema = createInsertSchema(proofreadingRuleCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProofreadingRuleCategory = z.infer<typeof insertProofreadingRuleCategorySchema>;
export type ProofreadingRuleCategory = typeof proofreadingRuleCategories.$inferSelect;

// Proofreading Rules table
export const proofreadingRules = pgTable("proofreading_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull().references(() => proofreadingRuleCategories.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  ruleText: text("rule_text").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const proofreadingRulesRelations = relations(proofreadingRules, ({ one }) => ({
  category: one(proofreadingRuleCategories, {
    fields: [proofreadingRules.categoryId],
    references: [proofreadingRuleCategories.id],
  }),
}));

export const insertProofreadingRuleSchema = createInsertSchema(proofreadingRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProofreadingRule = z.infer<typeof insertProofreadingRuleSchema>;
export type ProofreadingRule = typeof proofreadingRules.$inferSelect;

// Proofreading Status enum
export const proofreadingStatusEnum = pgEnum('proofreading_status', ['pending', 'processing', 'completed', 'failed']);

// Proofreadings table (similar to translations)
export const proofreadings = pgTable("proofreadings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  sourceText: text("source_text").notNull(),
  isPrivate: boolean("is_private").default(false).notNull(),
  selectedCategories: text("selected_categories").array(),
  lastUsedModelId: varchar("last_used_model_id").references(() => aiModels.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const proofreadingsRelations = relations(proofreadings, ({ one, many }) => ({
  user: one(users, {
    fields: [proofreadings.userId],
    references: [users.id],
  }),
  outputs: many(proofreadingOutputs),
  lastUsedModel: one(aiModels, {
    fields: [proofreadings.lastUsedModelId],
    references: [aiModels.id],
  }),
}));

export const insertProofreadingSchema = createInsertSchema(proofreadings).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProofreading = z.infer<typeof insertProofreadingSchema>;
export type Proofreading = typeof proofreadings.$inferSelect & {
  owner?: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
};

// Metadata type for sidebar - excludes sourceText for performance
export type ProofreadingMetadata = Omit<Proofreading, 'sourceText'>;

// Proofreading Outputs table (stores JSON results from LLM)
export const proofreadingOutputs = pgTable("proofreading_outputs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  proofreadingId: varchar("proofreading_id").notNull().references(() => proofreadings.id, { onDelete: 'cascade' }),
  results: jsonb("results").notNull(), // Array of {rule, original_text, suggested_change, rationale, status: 'pending'|'accepted'|'rejected'}
  modelId: varchar("model_id").references(() => aiModels.id),
  status: proofreadingStatusEnum("status").default('pending').notNull(),
  // Performance metrics (only set on successful completion)
  durationMs: integer("duration_ms"), // Time to complete proofreading in milliseconds
  outputTokens: integer("output_tokens"), // Output tokens used
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const proofreadingOutputsRelations = relations(proofreadingOutputs, ({ one }) => ({
  proofreading: one(proofreadings, {
    fields: [proofreadingOutputs.proofreadingId],
    references: [proofreadings.id],
  }),
  model: one(aiModels, {
    fields: [proofreadingOutputs.modelId],
    references: [aiModels.id],
  }),
}));

export const insertProofreadingOutputSchema = createInsertSchema(proofreadingOutputs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProofreadingOutput = z.infer<typeof insertProofreadingOutputSchema>;
export type ProofreadingOutput = typeof proofreadingOutputs.$inferSelect;

// Image Translation projects table
export const imageTranslations = pgTable("image_translations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  sourceImageBase64: text("source_image_base64").notNull(), // Base64 encoded image
  sourceMimeType: varchar("source_mime_type", { length: 50 }).notNull(),
  isPrivate: boolean("is_private").default(false).notNull(),
  selectedLanguages: text("selected_languages").array(),
  lastUsedModelId: varchar("last_used_model_id").references(() => aiModels.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const imageTranslationsRelations = relations(imageTranslations, ({ one, many }) => ({
  user: one(users, {
    fields: [imageTranslations.userId],
    references: [users.id],
  }),
  outputs: many(imageTranslationOutputs),
  lastUsedModel: one(aiModels, {
    fields: [imageTranslations.lastUsedModelId],
    references: [aiModels.id],
  }),
}));

export const insertImageTranslationSchema = createInsertSchema(imageTranslations).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertImageTranslation = z.infer<typeof insertImageTranslationSchema>;
export type ImageTranslation = typeof imageTranslations.$inferSelect & {
  owner?: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
};

// Image Translation outputs table (stores individual language translations)
export const imageTranslationOutputs = pgTable("image_translation_outputs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  imageTranslationId: varchar("image_translation_id").notNull().references(() => imageTranslations.id, { onDelete: 'cascade' }),
  languageCode: varchar("language_code", { length: 10 }).notNull(),
  languageName: varchar("language_name", { length: 100 }).notNull(),
  translatedImageBase64: text("translated_image_base64"), // Base64 encoded image
  translatedMimeType: varchar("translated_mime_type", { length: 50 }),
  modelId: varchar("model_id").references(() => aiModels.id),
  status: translationStatusEnum("status").default('pending').notNull(),
  // Performance metrics (only set on successful completion)
  durationMs: integer("duration_ms"), // Time to complete image translation in milliseconds
  outputTokens: integer("output_tokens"), // Output tokens used
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const imageTranslationOutputsRelations = relations(imageTranslationOutputs, ({ one }) => ({
  imageTranslation: one(imageTranslations, {
    fields: [imageTranslationOutputs.imageTranslationId],
    references: [imageTranslations.id],
  }),
  model: one(aiModels, {
    fields: [imageTranslationOutputs.modelId],
    references: [aiModels.id],
  }),
}));

export const insertImageTranslationOutputSchema = createInsertSchema(imageTranslationOutputs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertImageTranslationOutput = z.infer<typeof insertImageTranslationOutputSchema>;
export type ImageTranslationOutput = typeof imageTranslationOutputs.$inferSelect;

// Image Edit status enum
export const imageEditStatusEnum = pgEnum('image_edit_status', ['pending', 'processing', 'completed', 'failed']);

// Image Edit sessions table (stores source image for AI editing)
export const imageEdits = pgTable("image_edits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  sourceImageBase64: text("source_image_base64").notNull(), // Base64 encoded source image
  sourceMimeType: varchar("source_mime_type", { length: 50 }).notNull(),
  isPrivate: boolean("is_private").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const imageEditsRelations = relations(imageEdits, ({ one, many }) => ({
  user: one(users, {
    fields: [imageEdits.userId],
    references: [users.id],
  }),
  outputs: many(imageEditOutputs),
}));

export const insertImageEditSchema = createInsertSchema(imageEdits).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertImageEdit = z.infer<typeof insertImageEditSchema>;
export type ImageEdit = typeof imageEdits.$inferSelect & {
  owner?: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
};

// Metadata type - excludes sourceImageBase64 for performance (lazy loading)
export type ImageEditMetadata = Omit<ImageEdit, 'sourceImageBase64'>;

// Image Edit outputs table (stores AI-edited images)
export const imageEditOutputs = pgTable("image_edit_outputs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  imageEditId: varchar("image_edit_id").notNull().references(() => imageEdits.id, { onDelete: 'cascade' }),
  prompt: text("prompt").notNull(), // The edit instruction/prompt
  editedImageBase64: text("edited_image_base64"), // Base64 encoded edited image
  editedMimeType: varchar("edited_mime_type", { length: 50 }),
  model: varchar("model", { length: 50 }).notNull(), // 'openai' | 'gemini'
  status: imageEditStatusEnum("status").default('pending').notNull(),
  // Performance metrics (only set on successful completion)
  durationMs: integer("duration_ms"), // Time to complete image edit in milliseconds
  outputTokens: integer("output_tokens"), // Output tokens used
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const imageEditOutputsRelations = relations(imageEditOutputs, ({ one }) => ({
  imageEdit: one(imageEdits, {
    fields: [imageEditOutputs.imageEditId],
    references: [imageEdits.id],
  }),
}));

export const insertImageEditOutputSchema = createInsertSchema(imageEditOutputs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertImageEditOutput = z.infer<typeof insertImageEditOutputSchema>;
export type ImageEditOutput = typeof imageEditOutputs.$inferSelect;

// Metadata type - excludes editedImageBase64 for performance (lazy loading)
export type ImageEditOutputMetadata = Omit<ImageEditOutput, 'editedImageBase64'>;
