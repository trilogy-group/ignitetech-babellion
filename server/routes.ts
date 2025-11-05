// Reference: javascript_log_in_with_replit blueprint
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { z } from "zod";
import { encrypt } from "./encryption";
import { translationService } from "./translationService";
import { proofreadingService } from "./proofreadingService";
import { getGoogleAuth, listGoogleDocs, getGoogleDocContent } from "./googleDocsService";
import {
  insertTranslationSchema,
  insertAiModelSchema,
  insertLanguageSchema,
  insertSettingSchema,
  insertTranslationFeedbackSchema,
  insertProofreadingSchema,
  insertProofreadingRuleCategorySchema,
  insertProofreadingRuleSchema,
} from "@shared/schema";
import { logInfo, logError } from "./vite";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // ===== AUTH ROUTES =====
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ===== TRANSLATION ROUTES =====
  app.get("/api/translations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const translations = await storage.getTranslations(userId);
      res.json(translations);
    } catch (error) {
      console.error("Error fetching translations:", error);
      res.status(500).json({ message: "Failed to fetch translations" });
    }
  });

  app.get("/api/translations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const translation = await storage.getTranslation(req.params.id);
      if (!translation) {
        return res.status(404).json({ message: "Translation not found" });
      }
      // Check if user can access this translation (owner OR public translation)
      const isOwner = translation.userId === req.user.id;
      const isPublic = !translation.isPrivate;
      if (!isOwner && !isPublic) {
        return res.status(403).json({ message: "Forbidden" });
      }
      res.json(translation);
    } catch (error) {
      console.error("Error fetching translation:", error);
      res.status(500).json({ message: "Failed to fetch translation" });
    }
  });

  app.post("/api/translations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const data = insertTranslationSchema.parse(req.body);
      const translation = await storage.createTranslation({ 
        userId,
        title: data.title,
        sourceText: data.sourceText,
        isPrivate: data.isPrivate ?? false,
      });
      res.json(translation);
    } catch (error) {
      console.error("Error creating translation:", error);
      res.status(400).json({ message: "Failed to create translation" });
    }
  });

  app.patch("/api/translations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const translation = await storage.getTranslation(req.params.id);
      if (!translation) {
        return res.status(404).json({ message: "Translation not found" });
      }
      // Check if user owns the translation or is admin (admins can only edit public translations)
      const user = await storage.getUser(req.user.id);
      const isOwner = translation.userId === req.user.id;
      const isAdminEditingPublic = user?.isAdmin && !translation.isPrivate;
      const canEdit = isOwner || isAdminEditingPublic;
      if (!canEdit) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const updated = await storage.updateTranslation(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating translation:", error);
      res.status(400).json({ message: "Failed to update translation" });
    }
  });

  app.delete("/api/translations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const translation = await storage.getTranslation(req.params.id);
      if (!translation) {
        return res.status(404).json({ message: "Translation not found" });
      }
      // Check if user owns the translation or is admin (admins can only delete public translations)
      const user = await storage.getUser(req.user.id);
      const isOwner = translation.userId === req.user.id;
      const isAdminDeletingPublic = user?.isAdmin && !translation.isPrivate;
      const canDelete = isOwner || isAdminDeletingPublic;
      if (!canDelete) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteTranslation(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting translation:", error);
      res.status(500).json({ message: "Failed to delete translation" });
    }
  });

  // ===== TRANSLATION OUTPUT ROUTES =====
  app.get("/api/translations/:id/outputs", isAuthenticated, async (req: any, res) => {
    try {
      const translation = await storage.getTranslation(req.params.id);
      if (!translation) {
        return res.status(404).json({ message: "Translation not found" });
      }
      // Check if user can access this translation (owner OR public translation)
      const isOwner = translation.userId === req.user.id;
      const isPublic = !translation.isPrivate;
      if (!isOwner && !isPublic) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const outputs = await storage.getTranslationOutputs(req.params.id);
      res.json(outputs);
    } catch (error) {
      console.error("Error fetching outputs:", error);
      res.status(500).json({ message: "Failed to fetch outputs" });
    }
  });

  app.patch("/api/translation-outputs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { translatedText } = req.body;
      // Get the output to find its parent translation
      const output = await storage.getTranslationOutput(req.params.id);
      if (!output) {
        return res.status(404).json({ message: "Translation output not found" });
      }
      
      // Get the parent translation to check permissions
      const translation = await storage.getTranslation(output.translationId);
      if (!translation) {
        return res.status(404).json({ message: "Translation not found" });
      }
      
      // Check if user owns the translation or is admin (admins can only edit public translations)
      const user = await storage.getUser(req.user.id);
      const isOwner = translation.userId === req.user.id;
      const isAdminEditingPublic = user?.isAdmin && !translation.isPrivate;
      const canEdit = isOwner || isAdminEditingPublic;
      if (!canEdit) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updated = await storage.updateTranslationOutput(req.params.id, translatedText);
      res.json(updated);
    } catch (error) {
      console.error("Error updating output:", error);
      res.status(400).json({ message: "Failed to update output" });
    }
  });

  // ===== TRANSLATE ENDPOINT (Single language) =====
  app.post("/api/translate-single", isAuthenticated, async (req: any, res) => {
    try {
      const { translationId, languageCode, modelId } = req.body;

      // Verify user owns the translation or is admin (admins can only translate public translations)
      const translation = await storage.getTranslation(translationId);
      if (!translation) {
        return res.status(404).json({ message: "Translation not found" });
      }
      const user = await storage.getUser(req.user.id);
      const isOwner = translation.userId === req.user.id;
      const isAdminTranslatingPublic = user?.isAdmin && !translation.isPrivate;
      const canTranslate = isOwner || isAdminTranslatingPublic;
      if (!canTranslate) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get model details
      const model = await storage.getModel(modelId);
      if (!model) {
        return res.status(404).json({ message: "Model not found" });
      }

      // Get language details
      const language = await storage.getLanguageByCode(languageCode);
      if (!language) {
        return res.status(404).json({ message: `Language not found: ${languageCode}` });
      }

      // Get system prompt
      const promptSetting = await storage.getSetting('translation_system_prompt');
      const systemPrompt = promptSetting?.value;

      // Delete existing output for this language
      const existingOutputs = await storage.getTranslationOutputs(translationId);
      const existingOutput = existingOutputs.find(o => o.languageCode === languageCode);
      if (existingOutput) {
        await storage.deleteTranslationOutput(existingOutput.id);
      }

      // Log translation start
      logInfo(`Translating ${translationId} into ${language.name}`, "AI");
      const translateStartTime = Date.now();

      // Create output record with 'translating' status (translatedText will be null initially)
      const output = await storage.createTranslationOutput({
        translationId,
        languageCode: language.code,
        languageName: language.name,
        translatedText: null as any, // Null initially, will be set after translation
        modelId: model.id,
        translationStatus: 'translating',
        proofreadStatus: 'pending',
      });

      // Translate
      let translatedText: string;
      try {
        translatedText = await translationService.translate({
          text: translation.sourceText,
          targetLanguage: language.name,
          modelIdentifier: model.modelIdentifier,
          provider: model.provider as 'openai' | 'anthropic',
          systemPrompt,
        });
      } catch (error) {
        const translateTime = Math.round((Date.now() - translateStartTime) / 1000);
        logError(`Translation failed ${translationId} into ${language.name}, time: ${translateTime}s`, "AI", error);
        // Update status to failed
        await storage.updateTranslationOutputStatus(output.id, { translationStatus: 'failed' });
        throw error;
      }

      const translateTime = Math.round((Date.now() - translateStartTime) / 1000);
      logInfo(`Translated ${translationId} into ${language.name}, time: ${translateTime}s`, "AI");

      // Update with translated text and mark as completed
      const result = await storage.updateTranslationOutput(output.id, translatedText);
      await storage.updateTranslationOutputStatus(result.id, { translationStatus: 'completed' });

      res.json({ ...result, translationStatus: 'completed' });
    } catch (error) {
      console.error("Error translating:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Translation failed" });
    }
  });

  // ===== PROOFREAD ENDPOINT =====
  app.post("/api/proofread-translation", isAuthenticated, async (req: any, res) => {
    try {
      const { outputId } = req.body;

      if (!outputId) {
        return res.status(400).json({ message: "outputId is required" });
      }

      // Get the translation output
      const output = await storage.getTranslationOutput(outputId);
      if (!output) {
        return res.status(404).json({ message: "Translation output not found" });
      }

      // Get the parent translation
      const translation = await storage.getTranslation(output.translationId);
      if (!translation) {
        return res.status(404).json({ message: "Translation not found" });
      }

      // Verify user owns the translation or is admin (admins can only proofread public translations)
      const user = await storage.getUser(req.user.id);
      const isOwner = translation.userId === req.user.id;
      const isAdminProofreadingPublic = user?.isAdmin && !translation.isPrivate;
      const canProofread = isOwner || isAdminProofreadingPublic;
      if (!canProofread) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get model details (the same model used for translation)
      if (!output.modelId) {
        return res.status(400).json({ message: "Translation output has no associated model" });
      }
      const model = await storage.getModel(output.modelId);
      if (!model) {
        return res.status(404).json({ message: "Model not found" });
      }

      // Get language details
      const language = await storage.getLanguageByCode(output.languageCode);
      if (!language) {
        return res.status(404).json({ message: `Language not found: ${output.languageCode}` });
      }

      // Get proofreading system prompt
      const proofreadPromptSetting = await storage.getSetting('proofreading_system_prompt');
      const proofreadSystemPrompt = proofreadPromptSetting?.value;

      // Log proofreading start
      logInfo(`Proofreading ${translation.id} into ${language.name}`, "AI");
      const proofreadStartTime = Date.now();

      // Update status to proofreading
      await storage.updateTranslationOutputStatus(outputId, { proofreadStatus: 'proofreading' });

      // Proof-read the translation
      let proofreadText: string;
      try {
        proofreadText = await translationService.proofread(
          translation.sourceText,
          output.translatedText,
          language.name,
          model.modelIdentifier,
          model.provider as 'openai' | 'anthropic',
          proofreadSystemPrompt
        );
      } catch (error) {
        const proofreadTime = Math.round((Date.now() - proofreadStartTime) / 1000);
        logError(`Proofreading failed ${translation.id} into ${language.name}, time: ${proofreadTime}s`, "AI", error);
        // Update status to failed
        await storage.updateTranslationOutputStatus(outputId, { proofreadStatus: 'failed' });
        throw error;
      }

      const proofreadTime = Math.round((Date.now() - proofreadStartTime) / 1000);
      logInfo(`Proofread ${translation.id} into ${language.name}, time: ${proofreadTime}s`, "AI");

      // Update the translation output with proof-read text and mark as completed
      const updated = await storage.updateTranslationOutput(outputId, proofreadText);
      await storage.updateTranslationOutputStatus(updated.id, { proofreadStatus: 'completed' });

      res.json({ ...updated, proofreadStatus: 'completed' });
    } catch (error) {
      console.error("Error proofreading:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Proof-reading failed" });
    }
  });

  // ===== MODEL ROUTES (Public Read) =====
  app.get("/api/models", isAuthenticated, async (req, res) => {
    try {
      const models = await storage.getModels();
      res.json(models);
    } catch (error) {
      console.error("Error fetching models:", error);
      res.status(500).json({ message: "Failed to fetch models" });
    }
  });

  // ===== LANGUAGE ROUTES (Public Read) =====
  app.get("/api/languages", isAuthenticated, async (req, res) => {
    try {
      const languages = await storage.getLanguages();
      res.json(languages);
    } catch (error) {
      console.error("Error fetching languages:", error);
      res.status(500).json({ message: "Failed to fetch languages" });
    }
  });

  // ===== ADMIN ROUTES =====

  // API Keys
  app.get("/api/admin/api-keys/status", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const status = await storage.getApiKeysStatus();
      res.json(status);
    } catch (error) {
      console.error("Error fetching API key status:", error);
      res.status(500).json({ message: "Failed to fetch API key status" });
    }
  });

  app.post("/api/admin/api-keys", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { provider, apiKey } = req.body;
      if (!provider || !apiKey) {
        return res.status(400).json({ message: "Provider and API key required" });
      }

      const encryptedKey = encrypt(apiKey);
      await storage.upsertApiKey({ provider, encryptedKey });
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving API key:", error);
      res.status(500).json({ message: "Failed to save API key" });
    }
  });

  // Settings
  app.get("/api/admin/settings", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post("/api/admin/settings", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const data = insertSettingSchema.parse(req.body);
      const setting = await storage.upsertSetting(data);
      res.json(setting);
    } catch (error) {
      console.error("Error saving setting:", error);
      res.status(400).json({ message: "Failed to save setting" });
    }
  });

  // Models (Admin)
  app.post("/api/admin/models", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const data = insertAiModelSchema.parse(req.body);
      const model = await storage.createModel(data);
      res.json(model);
    } catch (error) {
      console.error("Error creating model:", error);
      res.status(400).json({ message: "Failed to create model" });
    }
  });

  app.patch("/api/admin/models/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const model = await storage.updateModel(req.params.id, req.body);
      res.json(model);
    } catch (error) {
      console.error("Error updating model:", error);
      res.status(400).json({ message: "Failed to update model" });
    }
  });

  app.delete("/api/admin/models/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteModel(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting model:", error);
      res.status(500).json({ message: "Failed to delete model" });
    }
  });

  // Languages (Admin)
  app.post("/api/admin/languages", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const data = insertLanguageSchema.parse(req.body);
      const language = await storage.createLanguage(data);
      res.json(language);
    } catch (error) {
      console.error("Error creating language:", error);
      res.status(400).json({ message: "Failed to create language" });
    }
  });

  app.delete("/api/admin/languages/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteLanguage(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting language:", error);
      res.status(500).json({ message: "Failed to delete language" });
    }
  });

  // Users (Admin)
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Don't send sensitive data
      const sanitizedUsers = users.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        profileImageUrl: u.profileImageUrl,
        isAdmin: u.isAdmin,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }));
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id/role", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { isAdmin } = req.body;
      const targetUserId = req.params.id;
      const currentUserId = req.user.id;

      // Prevent admin from changing their own role
      if (targetUserId === currentUserId) {
        return res.status(403).json({ message: "You cannot change your own role" });
      }

      if (typeof isAdmin !== 'boolean') {
        return res.status(400).json({ message: "isAdmin must be a boolean" });
      }

      const updated = await storage.updateUserRole(targetUserId, isAdmin);
      res.json({
        id: updated.id,
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
        isAdmin: updated.isAdmin,
      });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // ===== GOOGLE DOCS ROUTES =====
  app.get("/api/google/docs", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getGoogleAuth(req);
      const searchQuery = req.query.search as string | undefined;
      const docs = await listGoogleDocs(auth, searchQuery);
      res.json(docs);
    } catch (error: unknown) {
      console.error("Error fetching Google Docs:", error);
      const message = (error as Error)?.message || "Failed to fetch Google Docs";
      res.status(500).json({ message });
    }
  });

  app.get("/api/google/docs/:documentId", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getGoogleAuth(req);
      const { documentId } = req.params;
      const docContent = await getGoogleDocContent(auth, documentId);
      res.json(docContent);
    } catch (error: unknown) {
      console.error("Error fetching Google Doc content:", error);
      const message = (error as Error)?.message || "Failed to fetch Google Doc content";
      res.status(500).json({ message });
    }
  });

  // ===== FEEDBACK ROUTES =====
  app.post("/api/translation-feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const data = insertTranslationFeedbackSchema.parse({
        ...req.body,
        userId,
      });
      
      // Verify the translation output exists
      const output = await storage.getTranslationOutput(data.translationOutputId);
      if (!output) {
        return res.status(404).json({ message: "Translation output not found" });
      }

      const feedback = await storage.createTranslationFeedback(data);
      res.json(feedback);
    } catch (error) {
      console.error("Error creating translation feedback:", error);
      res.status(400).json({ message: "Failed to create feedback" });
    }
  });

  app.get("/api/translation-feedback/:translationId", isAuthenticated, async (req: any, res) => {
    try {
      const feedback = await storage.getTranslationFeedback(req.params.translationId);
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching translation feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  app.get("/api/all-feedback", isAuthenticated, async (req: any, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await storage.getAllTranslationFeedbackPaginated(page, limit);
      res.json(result);
    } catch (error) {
      console.error("Error fetching all feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  // ===== PROOFREADING ROUTES =====

  // Admin routes for proofreading rule categories
  app.get("/api/admin/proofreading-categories", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const categories = await storage.getProofreadingRuleCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching proofreading categories:", error);
      res.status(500).json({ message: "Failed to fetch proofreading categories" });
    }
  });

  app.post("/api/admin/proofreading-categories", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const data = insertProofreadingRuleCategorySchema.parse(req.body);
      const category = await storage.createProofreadingRuleCategory(data);
      res.json(category);
    } catch (error) {
      console.error("Error creating proofreading category:", error);
      res.status(400).json({ message: "Failed to create proofreading category" });
    }
  });

  app.patch("/api/admin/proofreading-categories/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const category = await storage.updateProofreadingRuleCategory(req.params.id, req.body);
      res.json(category);
    } catch (error) {
      console.error("Error updating proofreading category:", error);
      res.status(400).json({ message: "Failed to update proofreading category" });
    }
  });

  app.delete("/api/admin/proofreading-categories/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteProofreadingRuleCategory(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting proofreading category:", error);
      res.status(500).json({ message: "Failed to delete proofreading category" });
    }
  });

  // Admin routes for proofreading rules
  app.get("/api/admin/proofreading-rules", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const rules = await storage.getProofreadingRules();
      res.json(rules);
    } catch (error) {
      console.error("Error fetching proofreading rules:", error);
      res.status(500).json({ message: "Failed to fetch proofreading rules" });
    }
  });

  app.post("/api/admin/proofreading-rules", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const data = insertProofreadingRuleSchema.parse(req.body);
      const rule = await storage.createProofreadingRule(data);
      res.json(rule);
    } catch (error) {
      console.error("Error creating proofreading rule:", error);
      res.status(400).json({ message: "Failed to create proofreading rule" });
    }
  });

  app.patch("/api/admin/proofreading-rules/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const rule = await storage.updateProofreadingRule(req.params.id, req.body);
      res.json(rule);
    } catch (error) {
      console.error("Error updating proofreading rule:", error);
      res.status(400).json({ message: "Failed to update proofreading rule" });
    }
  });

  app.delete("/api/admin/proofreading-rules/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteProofreadingRule(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting proofreading rule:", error);
      res.status(500).json({ message: "Failed to delete proofreading rule" });
    }
  });

  // User routes for proofreadings
  app.get("/api/proofreadings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const proofreadings = await storage.getProofreadings(userId);
      res.json(proofreadings);
    } catch (error) {
      console.error("Error fetching proofreadings:", error);
      res.status(500).json({ message: "Failed to fetch proofreadings" });
    }
  });

  app.get("/api/proofreadings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const proofreading = await storage.getProofreading(req.params.id);
      if (!proofreading) {
        return res.status(404).json({ message: "Proofreading not found" });
      }
      // Check if user can access this proofreading (owner OR public proofreading)
      const isOwner = proofreading.userId === req.user.id;
      const isPublic = !proofreading.isPrivate;
      if (!isOwner && !isPublic) {
        return res.status(403).json({ message: "Forbidden" });
      }
      res.json(proofreading);
    } catch (error) {
      console.error("Error fetching proofreading:", error);
      res.status(500).json({ message: "Failed to fetch proofreading" });
    }
  });

  app.post("/api/proofreadings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const data = insertProofreadingSchema.parse(req.body);
      const proofreading = await storage.createProofreading({ 
        userId,
        title: data.title,
        sourceText: data.sourceText,
        isPrivate: data.isPrivate ?? false,
        selectedCategories: data.selectedCategories,
      });
      res.json(proofreading);
    } catch (error) {
      console.error("Error creating proofreading:", error);
      res.status(400).json({ message: "Failed to create proofreading" });
    }
  });

  app.patch("/api/proofreadings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const proofreading = await storage.getProofreading(req.params.id);
      if (!proofreading) {
        return res.status(404).json({ message: "Proofreading not found" });
      }
      // Check if user owns the proofreading or is admin (admins can only edit public proofreadings)
      const user = await storage.getUser(req.user.id);
      const isOwner = proofreading.userId === req.user.id;
      const isAdminEditingPublic = user?.isAdmin && !proofreading.isPrivate;
      const canEdit = isOwner || isAdminEditingPublic;
      if (!canEdit) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const updated = await storage.updateProofreading(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating proofreading:", error);
      res.status(400).json({ message: "Failed to update proofreading" });
    }
  });

  app.delete("/api/proofreadings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const proofreading = await storage.getProofreading(req.params.id);
      if (!proofreading) {
        return res.status(404).json({ message: "Proofreading not found" });
      }
      // Check if user owns the proofreading or is admin (admins can only delete public proofreadings)
      const user = await storage.getUser(req.user.id);
      const isOwner = proofreading.userId === req.user.id;
      const isAdminDeletingPublic = user?.isAdmin && !proofreading.isPrivate;
      const canDelete = isOwner || isAdminDeletingPublic;
      if (!canDelete) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteProofreading(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting proofreading:", error);
      res.status(500).json({ message: "Failed to delete proofreading" });
    }
  });

  app.get("/api/proofreadings/:id/output", isAuthenticated, async (req: any, res) => {
    try {
      const proofreading = await storage.getProofreading(req.params.id);
      if (!proofreading) {
        return res.status(404).json({ message: "Proofreading not found" });
      }
      // Check if user can access this proofreading (owner OR public proofreading)
      const isOwner = proofreading.userId === req.user.id;
      const isPublic = !proofreading.isPrivate;
      if (!isOwner && !isPublic) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const output = await storage.getProofreadingOutputByProofreadingId(req.params.id);
      res.json(output || null);
    } catch (error) {
      console.error("Error fetching proofreading output:", error);
      res.status(500).json({ message: "Failed to fetch proofreading output" });
    }
  });

  // Update suggestion status in proofreading output
  app.patch("/api/proofreadings/:id/output/suggestion/:index", isAuthenticated, async (req: any, res) => {
    try {
      const { status } = req.body;
      const suggestionIndex = parseInt(req.params.index);
      
      if (!status || !['pending', 'accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'pending', 'accepted', or 'rejected'" });
      }
      
      if (isNaN(suggestionIndex) || suggestionIndex < 0) {
        return res.status(400).json({ message: "Invalid suggestion index" });
      }

      const proofreading = await storage.getProofreading(req.params.id);
      if (!proofreading) {
        return res.status(404).json({ message: "Proofreading not found" });
      }
      
      // Check if user is owner
      if (proofreading.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const output = await storage.getProofreadingOutputByProofreadingId(req.params.id);
      if (!output) {
        return res.status(404).json({ message: "Proofreading output not found" });
      }

      // Update the status of the specific suggestion
      const results = output.results as Array<{
        rule: string;
        original_text: string;
        suggested_change: string;
        rationale: string;
        status?: string;
      }>;

      if (suggestionIndex >= results.length) {
        return res.status(400).json({ message: "Suggestion index out of range" });
      }

      results[suggestionIndex] = {
        ...results[suggestionIndex],
        status: status as 'pending' | 'accepted' | 'rejected'
      };

      // Update the output in the database
      await storage.updateProofreadingOutput(output.id, { results });

      res.json({ success: true, message: "Suggestion status updated" });
    } catch (error) {
      console.error("Error updating suggestion status:", error);
      res.status(500).json({ message: "Failed to update suggestion status" });
    }
  });

  // Get active categories for selection
  app.get("/api/proofreading-categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getProofreadingRuleCategories();
      const activeCategories = categories.filter(c => c.isActive);
      res.json(activeCategories);
    } catch (error) {
      console.error("Error fetching proofreading categories:", error);
      res.status(500).json({ message: "Failed to fetch proofreading categories" });
    }
  });

  // Get rules for selected categories
  app.get("/api/proofreading-rules", isAuthenticated, async (req, res) => {
    try {
      const categoryIds = (req.query.categoryIds as string)?.split(',') || [];
      if (categoryIds.length === 0) {
        return res.json([]);
      }
      const rules = await storage.getProofreadingRulesByCategoryIds(categoryIds);
      const activeRules = rules.filter(r => r.isActive);
      res.json(activeRules);
    } catch (error) {
      console.error("Error fetching proofreading rules:", error);
      res.status(500).json({ message: "Failed to fetch proofreading rules" });
    }
  });

  // Execute proofreading
  app.post("/api/proofread-execute", isAuthenticated, async (req: any, res) => {
    try {
      const { proofreadingId, categoryIds, modelId, text } = req.body;

      if (!proofreadingId || !categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0 || !modelId) {
        return res.status(400).json({ message: "proofreadingId, categoryIds array, and modelId are required" });
      }

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ message: "text is required" });
      }

      // Verify user owns the proofreading or is admin (admins can only proofread public proofreadings)
      const proofreading = await storage.getProofreading(proofreadingId);
      if (!proofreading) {
        return res.status(404).json({ message: "Proofreading not found" });
      }
      const user = await storage.getUser(req.user.id);
      const isOwner = proofreading.userId === req.user.id;
      const isAdminProofreadingPublic = user?.isAdmin && !proofreading.isPrivate;
      const canProofread = isOwner || isAdminProofreadingPublic;
      if (!canProofread) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get model details
      const model = await storage.getModel(modelId);
      if (!model) {
        return res.status(404).json({ message: "Model not found" });
      }

      // Get rules for selected categories
      const rules = await storage.getProofreadingRulesByCategoryIds(categoryIds);
      const activeRules = rules.filter(r => r.isActive);
      
      if (activeRules.length === 0) {
        return res.status(400).json({ message: "No active rules found for selected categories" });
      }

      // Log proofreading start
      logInfo(`Proofreading ${proofreadingId}`, "AI");
      const proofreadStartTime = Date.now();

      // Create output record with 'processing' status
      const output = await storage.createProofreadingOutput({
        proofreadingId,
        results: [],
        modelId: model.id,
        status: 'processing',
      });

      // Execute proofreading - use text from request body (current editor content) instead of saved text
      let results: Array<{ rule: string; original_text: string; suggested_change: string; rationale: string }>;
      try {
        const proofreadingResults = await proofreadingService.proofread({
          text: text.trim(),
          rules: activeRules.map(r => ({ title: r.title, ruleText: r.ruleText })),
          modelIdentifier: model.modelIdentifier,
          provider: model.provider as 'openai' | 'anthropic',
        });
        results = proofreadingResults;
      } catch (error) {
        const proofreadTime = Math.round((Date.now() - proofreadStartTime) / 1000);
        logError(`Proofreading failed ${proofreadingId}, time: ${proofreadTime}s`, "AI", error);
        // Update status to failed
        await storage.updateProofreadingOutput(output.id, { status: 'failed' });
        throw error;
      }

      const proofreadTime = Math.round((Date.now() - proofreadStartTime) / 1000);
      logInfo(`Proofread ${proofreadingId}, time: ${proofreadTime}s`, "AI");

      // Update the output with results and mark as completed
      const updated = await storage.updateProofreadingOutput(output.id, { 
        results: results as unknown as Record<string, unknown>[],
        status: 'completed' 
      });

      // Update last used model
      await storage.updateProofreading(proofreadingId, { lastUsedModelId: modelId });

      res.json({ ...updated, status: 'completed' });
    } catch (error) {
      console.error("Error executing proofreading:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Proofreading failed" });
    }
  });

  const httpServer = createServer(app);
  
  // Set server timeout to 20 minutes (1200000ms) for long-running AI requests
  // This is higher than the OpenAI client timeout (15 minutes) to allow for network overhead
  httpServer.timeout = 1200000; // 20 minutes
  
  // Set keepAlive timeout to prevent premature connection closure
  httpServer.keepAliveTimeout = 65000; // 65 seconds
  httpServer.headersTimeout = 66000; // 66 seconds (must be > keepAliveTimeout)
  
  return httpServer;
}
