// Reference: javascript_log_in_with_replit blueprint
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { z } from "zod";
import { encrypt } from "./encryption";
import { translationService } from "./translationService";
import {
  insertTranslationSchema,
  insertAiModelSchema,
  insertLanguageSchema,
  insertSettingSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // ===== AUTH ROUTES =====
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      // Verify user owns this translation
      if (translation.userId !== req.user.claims.sub) {
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
      const userId = req.user.claims.sub;
      const data = insertTranslationSchema.parse(req.body);
      const translation = await storage.createTranslation({ ...data, userId });
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
      if (translation.userId !== req.user.claims.sub) {
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
      if (translation.userId !== req.user.claims.sub) {
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
      if (translation.userId !== req.user.claims.sub) {
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
      const updated = await storage.updateTranslationOutput(req.params.id, translatedText);
      res.json(updated);
    } catch (error) {
      console.error("Error updating output:", error);
      res.status(400).json({ message: "Failed to update output" });
    }
  });

  // ===== TRANSLATE ENDPOINT (Parallel translation calls) =====
  app.post("/api/translate", isAuthenticated, async (req: any, res) => {
    try {
      const { translationId, languageCodes, modelId } = req.body;

      // Verify user owns the translation
      const translation = await storage.getTranslation(translationId);
      if (!translation) {
        return res.status(404).json({ message: "Translation not found" });
      }
      if (translation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get model details
      const model = await storage.getModel(modelId);
      if (!model) {
        return res.status(404).json({ message: "Model not found" });
      }

      // Get system prompt
      const promptSetting = await storage.getSetting('translation_system_prompt');
      const systemPrompt = promptSetting?.value;

      // Delete existing outputs for this translation
      await storage.deleteTranslationOutputsByTranslationId(translationId);

      // Translate to all languages in parallel
      const translationPromises = languageCodes.map(async (langCode: string) => {
        const language = await storage.getLanguageByCode(langCode);
        if (!language) {
          throw new Error(`Language not found: ${langCode}`);
        }

        const translatedText = await translationService.translate({
          text: translation.sourceText,
          targetLanguage: language.name,
          modelIdentifier: model.modelIdentifier,
          provider: model.provider as 'openai' | 'anthropic',
          systemPrompt,
        });

        return storage.createTranslationOutput({
          translationId,
          languageCode: language.code,
          languageName: language.name,
          translatedText,
          modelId: model.id,
        });
      });

      const results = await Promise.all(translationPromises);
      res.json(results);
    } catch (error) {
      console.error("Error translating:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Translation failed" });
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

  const httpServer = createServer(app);
  return httpServer;
}
