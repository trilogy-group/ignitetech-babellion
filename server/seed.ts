import { storage } from "./storage";

async function seed() {
  console.log("Seeding database...");

  // Create default AI models
  const models = [
    {
      name: "GPT-5",
      provider: "openai",
      modelIdentifier: "gpt-5",
      isDefault: true,
      isActive: true,
    },
    {
      name: "GPT-5 Mini",
      provider: "openai",
      modelIdentifier: "gpt-5-mini",
      isDefault: false,
      isActive: true,
    },
    {
      name: "Claude 4.5 Sonnet",
      provider: "anthropic",
      modelIdentifier: "claude-sonnet-4-20250514",
      isDefault: false,
      isActive: true,
    },
  ];

  for (const model of models) {
    try {
      await storage.createModel(model);
      console.log(`Created model: ${model.name}`);
    } catch (error) {
      console.log(`Model ${model.name} already exists or error:`, error);
    }
  }

  // Create default languages
  const languages = [
    { code: "en", name: "English", nativeName: "English", isActive: true },
    { code: "es", name: "Spanish", nativeName: "Español", isActive: true },
    { code: "zh", name: "Chinese", nativeName: "中文", isActive: true },
    { code: "fr", name: "French", nativeName: "Français", isActive: true },
    { code: "de", name: "German", nativeName: "Deutsch", isActive: true },
    { code: "ja", name: "Japanese", nativeName: "日本語", isActive: true },
    { code: "ko", name: "Korean", nativeName: "한국어", isActive: true },
    { code: "ar", name: "Arabic", nativeName: "العربية", isActive: true },
    { code: "pt", name: "Portuguese", nativeName: "Português", isActive: true },
    { code: "hi", name: "Hindi", nativeName: "हिन्दी", isActive: true },
  ];

  for (const language of languages) {
    try {
      await storage.createLanguage(language);
      console.log(`Created language: ${language.name}`);
    } catch (error) {
      console.log(`Language ${language.name} already exists or error:`, error);
    }
  }

  // Create default system prompt setting
  try {
    await storage.upsertSetting({
      key: "translation_system_prompt",
      value: "You are a professional translator specialized in marketing and business content. Translate the text while maintaining the tone, style, formatting, and intent of the original. Preserve any special formatting, bullet points, or emphasis. Return only the translated text without explanations or commentary.",
    });
    console.log("Created default system prompt");
  } catch (error) {
    console.log("System prompt already exists or error:", error);
  }

  console.log("Seeding complete!");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
