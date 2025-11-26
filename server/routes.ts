// Reference: javascript_log_in_with_replit blueprint
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { z } from "zod";
import { encrypt } from "./encryption";
import { translationService } from "./translationService";
import { proofreadingService } from "./proofreadingService";
import { pdfService } from "./pdfService";
import { getGoogleAuth, listGoogleDocs, getGoogleDocContent, createGoogleDoc } from "./googleDocsService";
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
import { retryOnDatabaseError } from "./retry";
import multer from "multer";

/**
 * Register and configure all API routes on the given Express application and return a configured HTTP server.
 *
 * Routes registered include authentication, translations and translation outputs (including async translate pipeline),
 * models, languages, admin endpoints (API keys, settings, models, languages, users), Google Docs helpers, feedback,
 * proofreading (admin and user flows, including async proofreading execution), and supporting pagination/access controls.
 *
 * @param app - The Express application to attach routes and middleware to.
 * @returns An HTTP server instance with extended timeouts and keep-alive settings tuned for long-running AI requests.
 */
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
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;

      const result = await storage.getTranslationsPaginated(userId, page, limit, search);
      res.json(result);
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

      // Start async job - don't await, return immediately
      (async () => {
        const translateStartTime = Date.now();
        
        try {
          // Step 1: Translate
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
            // Update status to failed with retry
            await retryOnDatabaseError(() => 
              storage.updateTranslationOutputStatus(output.id, { translationStatus: 'failed' })
            );
            return; // Exit early if translation fails
          }

          const translateTime = Math.round((Date.now() - translateStartTime) / 1000);
          logInfo(`Translated ${translationId} into ${language.name}, time: ${translateTime}s`, "AI");

          // Update with translated text and mark translation as completed (with retry)
          await retryOnDatabaseError(() => 
            storage.updateTranslationOutput(output.id, translatedText)
          );
          await retryOnDatabaseError(() => 
            storage.updateTranslationOutputStatus(output.id, { translationStatus: 'completed' })
          );

          // Step 2: Automatically trigger proofreading
          try {
            // Update proofread status to proof_reading (with retry)
            await retryOnDatabaseError(() => 
              storage.updateTranslationOutputStatus(output.id, { proofreadStatus: 'proof_reading' })
            );

            // Get proofreading system prompt (with retry)
            const proofreadPromptSetting = await retryOnDatabaseError(() => 
              storage.getSetting('proofreading_system_prompt')
            );
            const proofreadSystemPrompt = proofreadPromptSetting?.value;

            logInfo(`Proofreading ${translationId} into ${language.name}`, "AI");
            const proofreadStartTime = Date.now();

            // Execute Step 1: Generate proposed changes
            const step1Result = await translationService.proofreadStep1(
              translation.sourceText,
              translatedText,
              language.name,
              model.modelIdentifier,
              model.provider as 'openai' | 'anthropic',
              proofreadSystemPrompt
            );

            // Save proposed changes and original translation (with retry)
            await retryOnDatabaseError(() => 
              storage.updateTranslationOutputProofreadData(output.id, {
                proofreadProposedChanges: step1Result.proposedChanges,
                proofreadOriginalTranslation: translatedText,
              })
            );

            // Update status to applying_proofread before Step 2 (with retry)
            await retryOnDatabaseError(() => 
              storage.updateTranslationOutputStatus(output.id, { proofreadStatus: 'applying_proofread' })
            );

            // Execute Step 2: Apply changes to produce final translation
            const finalTranslation = await translationService.proofreadStep2(
              step1Result.userInputStep1,
              step1Result.proposedChanges,
              model.modelIdentifier,
              model.provider as 'openai' | 'anthropic',
              proofreadSystemPrompt
            );

            // Update with final proofread translation (with retry)
            await retryOnDatabaseError(() => 
              storage.updateTranslationOutput(output.id, finalTranslation)
            );
            
            // Mark proofreading as completed (with retry)
            await retryOnDatabaseError(() => 
              storage.updateTranslationOutputStatus(output.id, { proofreadStatus: 'completed' })
            );

            const proofreadTime = Math.round((Date.now() - proofreadStartTime) / 1000);
            logInfo(`Proofread ${translationId} into ${language.name}, time: ${proofreadTime}s`, "AI");
          } catch (error) {
            const proofreadStartTime = Date.now();
            const proofreadTime = Math.round((Date.now() - proofreadStartTime) / 1000);
            logError(`Proofreading failed ${translationId} into ${language.name}, time: ${proofreadTime}s`, "AI", error);
            // Update status to failed, but keep the translated text (with retry)
            await retryOnDatabaseError(() => 
              storage.updateTranslationOutputStatus(output.id, { proofreadStatus: 'failed' })
            ).catch((retryError) => {
              // If retry also fails, log but don't throw - we've already logged the original error
              logError(`Failed to update proofread status to failed after retries for ${translationId}`, "AI", retryError);
            });
          }
        } catch (error) {
          console.error(`Unexpected error in translation pipeline for ${translationId} into ${language.name}:`, error);
        }
      })(); // Fire and forget - async job runs in background

      // Return immediately with the output record (status: translating)
      res.json(output);
    } catch (error) {
      console.error("Error starting translation:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to start translation" });
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

  // Create Google Doc from translation output
  app.post("/api/google/docs/create-from-translation", isAuthenticated, async (req: any, res) => {
    try {
      const { translationOutputId, title } = req.body;
      
      if (!translationOutputId) {
        return res.status(400).json({ message: "translationOutputId is required" });
      }
      
      // Get translation output
      const output = await storage.getTranslationOutput(translationOutputId);
      if (!output) {
        return res.status(404).json({ message: "Translation output not found" });
      }
      
      // Check if user can access this translation
      const translation = await storage.getTranslation(output.translationId);
      if (!translation) {
        return res.status(404).json({ message: "Translation not found" });
      }
      
      const isOwner = translation.userId === req.user.id;
      const isPublic = !translation.isPrivate;
      if (!isOwner && !isPublic) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Get translated text (use edited version if available, otherwise use translatedText)
      const htmlContent = output.translatedText || '';
      if (!htmlContent) {
        return res.status(400).json({ message: "No translation content available" });
      }
      
      // Format title: [LANGUAGE] Original Title
      const docTitle = title || `[${output.languageCode.toUpperCase()}] ${translation.title}`;
      
      // Create Google Doc
      const auth = await getGoogleAuth(req);
      const result = await createGoogleDoc(auth, docTitle, htmlContent);
      
      res.json(result);
    } catch (error: unknown) {
      console.error("Error creating Google Doc from translation:", error);
      const err = error as Error & { code?: number; errors?: Array<{ reason?: string }> };
      let message = err?.message || "Failed to create Google Doc";
      let statusCode = 500;
      
      // Check for OAuth scope/permission errors
      if (err?.code === 403 || err?.errors?.[0]?.reason === 'insufficientPermissions' || 
          message.includes('insufficient') || message.includes('Insufficient Permission')) {
        statusCode = 403;
        message = "Insufficient permissions. Please log out and log back in to grant the necessary permissions for creating Google Docs.";
      }
      
      res.status(statusCode).json({ message });
    }
  });

  // Create Google Doc from translation source
  app.post("/api/google/docs/create-from-translation-source", isAuthenticated, async (req: any, res) => {
    try {
      const { translationId, title, htmlContent } = req.body;
      
      if (!translationId) {
        return res.status(400).json({ message: "translationId is required" });
      }
      
      // Get translation
      const translation = await storage.getTranslation(translationId);
      if (!translation) {
        return res.status(404).json({ message: "Translation not found" });
      }
      
      // Check if user can access this translation
      const isOwner = translation.userId === req.user.id;
      const isPublic = !translation.isPrivate;
      if (!isOwner && !isPublic) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Use provided htmlContent (from editor) or fall back to sourceText from DB
      const contentToUse = htmlContent || translation.sourceText || '';
      if (!contentToUse) {
        return res.status(400).json({ message: "No translation content available" });
      }
      
      // Use provided title or original title
      const docTitle = title || translation.title;
      
      // Create Google Doc
      const auth = await getGoogleAuth(req);
      const result = await createGoogleDoc(auth, docTitle, contentToUse);
      
      res.json(result);
    } catch (error: unknown) {
      console.error("Error creating Google Doc from translation source:", error);
      const err = error as Error & { code?: number; errors?: Array<{ reason?: string }> };
      let message = err?.message || "Failed to create Google Doc";
      let statusCode = 500;
      
      // Check for OAuth scope/permission errors
      if (err?.code === 403 || err?.errors?.[0]?.reason === 'insufficientPermissions' || 
          message.includes('insufficient') || message.includes('Insufficient Permission')) {
        statusCode = 403;
        message = "Insufficient permissions. Please log out and log back in to grant the necessary permissions for creating Google Docs.";
      }
      
      res.status(statusCode).json({ message });
    }
  });

  // Create Google Doc from proofreading
  app.post("/api/google/docs/create-from-proofread", isAuthenticated, async (req: any, res) => {
    try {
      const { proofreadingId, title, htmlContent } = req.body;
      
      if (!proofreadingId) {
        return res.status(400).json({ message: "proofreadingId is required" });
      }
      
      // Get proofreading
      const proofreading = await storage.getProofreading(proofreadingId);
      if (!proofreading) {
        return res.status(404).json({ message: "Proofreading not found" });
      }
      
      // Check if user can access this proofreading
      const isOwner = proofreading.userId === req.user.id;
      const isPublic = !proofreading.isPrivate;
      if (!isOwner && !isPublic) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Use provided htmlContent (from editor) or fall back to sourceText from DB
      const contentToUse = htmlContent || proofreading.sourceText || '';
      if (!contentToUse) {
        return res.status(400).json({ message: "No proofreading content available" });
      }
      
      // Use provided title or original title
      const docTitle = title || proofreading.title;
      
      // Create Google Doc
      const auth = await getGoogleAuth(req);
      const result = await createGoogleDoc(auth, docTitle, contentToUse);
      
      res.json(result);
    } catch (error: unknown) {
      console.error("Error creating Google Doc from proofreading:", error);
      const err = error as Error & { code?: number; errors?: Array<{ reason?: string }> };
      let message = err?.message || "Failed to create Google Doc";
      let statusCode = 500;
      
      // Check for OAuth scope/permission errors
      if (err?.code === 403 || err?.errors?.[0]?.reason === 'insufficientPermissions' || 
          message.includes('insufficient') || message.includes('Insufficient Permission')) {
        statusCode = 403;
        message = "Insufficient permissions. Please log out and log back in to grant the necessary permissions for creating Google Docs.";
      }
      
      res.status(statusCode).json({ message });
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
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;

      const result = await storage.getProofreadingsPaginated(userId, page, limit, search);
      res.json(result);
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

      // Create output record with 'processing' status
      const output = await storage.createProofreadingOutput({
        proofreadingId,
        results: [],
        modelId: model.id,
        status: 'processing',
      });

      // Fire and forget - async proofreading runs in background
      (async () => {
        try {
          // Log proofreading start
          logInfo(`Proofreading ${proofreadingId}`, "AI");
          const proofreadStartTime = Date.now();

          // Execute proofreading - use text from request body (current editor content) instead of saved text
          const proofreadingResults = await proofreadingService.proofread({
            text: text.trim(),
            rules: activeRules.map(r => ({ title: r.title, ruleText: r.ruleText })),
            modelIdentifier: model.modelIdentifier,
            provider: model.provider as 'openai' | 'anthropic',
          });

          const proofreadTime = Math.round((Date.now() - proofreadStartTime) / 1000);
          logInfo(`Proofread ${proofreadingId}, time: ${proofreadTime}s`, "AI");

          // Update the output with results and mark as completed (with retry)
          await retryOnDatabaseError(() => 
            storage.updateProofreadingOutput(output.id, { 
              results: proofreadingResults as unknown as Record<string, unknown>[],
              status: 'completed' 
            })
          );

          // Update last used model (with retry)
          await retryOnDatabaseError(() => 
            storage.updateProofreading(proofreadingId, { lastUsedModelId: modelId })
          );
        } catch (error) {
          const proofreadStartTime = Date.now();
          const proofreadTime = Math.round((Date.now() - proofreadStartTime) / 1000);
          logError(`Proofreading failed ${proofreadingId}, time: ${proofreadTime}s`, "AI", error);
          // Update status to failed (with retry)
          await retryOnDatabaseError(() => 
            storage.updateProofreadingOutput(output.id, { status: 'failed' })
          ).catch((retryError) => {
            // If retry also fails, log but don't throw - we've already logged the original error
            logError(`Failed to update proofreading status to failed after retries for ${proofreadingId}`, "AI", retryError);
          });
        }
      })(); // Fire and forget - async job runs in background

      // Return immediately with the output record (status: processing)
      res.json(output);
    } catch (error) {
      console.error("Error starting proofreading:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to start proofreading" });
    }
  });

  // ===== PDF IMPORT ROUTES =====
  
  // Configure multer for memory storage (we process the file in memory)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB max file size
    },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed'));
      }
    },
  });

  // Quick Import - Basic text extraction from PDF
  app.post("/api/pdf/quick-import", isAuthenticated, upload.single('pdf'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No PDF file provided" });
      }

      logInfo(`Quick PDF import started, file size: ${req.file.size} bytes`, "PDF");
      const startTime = Date.now();

      const result = await pdfService.quickImport(req.file.buffer);

      const duration = Math.round((Date.now() - startTime) / 1000);
      logInfo(`Quick PDF import completed in ${duration}s, pages: ${result.pageCount}`, "PDF");

      res.json({
        success: true,
        html: result.html,
        text: result.text,
        pageCount: result.pageCount,
      });
    } catch (error: unknown) {
      console.error("Error in quick PDF import:", error);
      const message = error instanceof Error ? error.message : "Failed to import PDF";
      res.status(500).json({ message });
    }
  });

  // Deep Import - Text extraction + LLM-based formatting
  app.post("/api/pdf/deep-import", isAuthenticated, upload.single('pdf'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No PDF file provided" });
      }

      // Get the model identifier from settings or use default
      let modelIdentifier: string;
      
      // Check if a specific model was provided in the request
      const requestedModelId = req.body.modelId;
      if (requestedModelId) {
        const model = await storage.getModel(requestedModelId);
        if (!model) {
          return res.status(400).json({ message: "Specified model not found" });
        }
        if (model.provider !== 'anthropic') {
          return res.status(400).json({ message: "Deep import only supports Anthropic models" });
        }
        modelIdentifier = model.modelIdentifier;
      } else {
        // Try to get the PDF cleanup model from settings
        const pdfModelSetting = await storage.getSetting('pdf_cleanup_model');
        if (pdfModelSetting?.value) {
          modelIdentifier = pdfModelSetting.value;
        } else {
          // Fallback to default Anthropic model
          modelIdentifier = 'claude-sonnet-4-20250514';
        }
      }

      logInfo(`Deep PDF import started, file size: ${req.file.size} bytes, model: ${modelIdentifier}`, "PDF");
      const startTime = Date.now();

      const result = await pdfService.deepImport(req.file.buffer, { modelIdentifier });

      const duration = Math.round((Date.now() - startTime) / 1000);
      logInfo(`Deep PDF import completed in ${duration}s, pages: ${result.pageCount}`, "PDF");

      res.json({
        success: true,
        html: result.html,
        text: result.text,
        pageCount: result.pageCount,
      });
    } catch (error: unknown) {
      console.error("Error in deep PDF import:", error);
      const message = error instanceof Error ? error.message : "Failed to import PDF";
      res.status(500).json({ message });
    }
  });

  // Deep Import with Streaming - Streams HTML chunks as they're generated
  app.post("/api/pdf/deep-import-stream", isAuthenticated, upload.single('pdf'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No PDF file provided" });
      }

      // Get the model identifier from settings or use default
      let modelIdentifier: string;
      
      const requestedModelId = req.body.modelId;
      if (requestedModelId) {
        const model = await storage.getModel(requestedModelId);
        if (!model) {
          return res.status(400).json({ message: "Specified model not found" });
        }
        if (model.provider !== 'anthropic') {
          return res.status(400).json({ message: "Deep import only supports Anthropic models" });
        }
        modelIdentifier = model.modelIdentifier;
      } else {
        const pdfModelSetting = await storage.getSetting('pdf_cleanup_model');
        if (pdfModelSetting?.value) {
          modelIdentifier = pdfModelSetting.value;
        } else {
          modelIdentifier = 'claude-sonnet-4-20250514';
        }
      }

      logInfo(`Streaming PDF import started, file size: ${req.file.size} bytes, model: ${modelIdentifier}`, "PDF");

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx proxy buffering (Replit, etc.)
      res.setHeader('X-Content-Type-Options', 'nosniff'); // Prevent MIME type sniffing
      res.flushHeaders();

      // Get page count first
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: req.file.buffer });
      const infoResult = await parser.getInfo();
      await parser.destroy();
      const pageCount = infoResult.total;

      // Send initial event with page count
      // Add 2KB of padding to force flush through any proxies (like Replit's)
      const padding = ' '.repeat(2048);
      res.write(`: ${padding}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'start', pageCount })}\n\n`);

      // Stream the HTML chunks
      let fullHtml = '';
      for await (const chunk of pdfService.streamPdfWithClaude(req.file.buffer, modelIdentifier)) {
        fullHtml += chunk;
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      }

      // Send completion event
      res.write(`data: ${JSON.stringify({ type: 'complete', html: fullHtml })}\n\n`);
      res.end();

      logInfo(`Streaming PDF import completed, pages: ${pageCount}`, "PDF");
    } catch (error: unknown) {
      console.error("Error in streaming PDF import:", error);
      const message = error instanceof Error ? error.message : "Failed to import PDF";
      // Try to send error as SSE if headers not sent
      if (!res.headersSent) {
        res.status(500).json({ message });
      } else {
        res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
        res.end();
      }
    }
  });

  // Get PDF cleanup model setting
  app.get("/api/settings/pdf-cleanup-model", isAuthenticated, async (req, res) => {
    try {
      const setting = await storage.getSetting('pdf_cleanup_model');
      res.json({ 
        value: setting?.value || 'claude-sonnet-4-20250514',
        isDefault: !setting?.value
      });
    } catch (error) {
      console.error("Error fetching PDF cleanup model setting:", error);
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });

  // Update PDF cleanup model setting (admin only)
  app.post("/api/admin/settings/pdf-cleanup-model", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { value } = req.body;
      if (!value || typeof value !== 'string') {
        return res.status(400).json({ message: "Model identifier is required" });
      }
      
      const setting = await storage.upsertSetting({
        key: 'pdf_cleanup_model',
        value,
      });
      
      res.json(setting);
    } catch (error) {
      console.error("Error saving PDF cleanup model setting:", error);
      res.status(500).json({ message: "Failed to save setting" });
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