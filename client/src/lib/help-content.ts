/**
 * Help content data for Babellion's in-app help system.
 * Contains structured content for each feature including illustrations,
 * workflow steps, and tips.
 */

export type FeatureId = 'proofread' | 'translate' | 'image-translate' | 'image-edit' | 'settings';

export interface HelpStep {
  title: string;
  description: string;
}

export interface HelpTip {
  text: string;
  icon?: string;
}

export interface RelatedFeature {
  id: FeatureId;
  title: string;
  description: string;
}

export interface FeatureHelp {
  id: FeatureId;
  title: string;
  tagline: string;
  heroIllustration: string;
  overview: string;
  capabilities: string[];
  workflow: HelpStep[];
  tips: HelpTip[];
  relatedFeatures: RelatedFeature[];
}

export const helpContent: Record<FeatureId, FeatureHelp> = {
  proofread: {
    id: 'proofread',
    title: 'Proofread',
    tagline: 'AI-powered text refinement',
    heroIllustration: '/help/illustration-proofread-hero.png',
    overview: 'Get intelligent suggestions for grammar, style, and clarity improvements. Review each suggestion and accept or reject changes with a single click.',
    capabilities: [
      'Grammar and spelling corrections',
      'Style and tone improvements',
      'Clarity and readability enhancements',
      'Multiple rule categories to choose from',
      'Import from Google Docs or PDF',
    ],
    workflow: [
      {
        title: 'Create or select a project',
        description: 'Start a new proofreading project or select an existing one from the History panel on the left.',
      },
      {
        title: 'Add your content',
        description: 'Type or paste your text directly, or import from Google Docs or PDF. Advanced PDF import uses AI to preserve formatting.',
      },
      {
        title: 'Choose rule categories',
        description: 'Select which types of improvements you want: Grammar, Style, Clarity, and more. Categories are configured by your admin.',
      },
      {
        title: 'Run proofreading',
        description: 'Select an AI model and click "Proofread" to analyze your text. Results appear in the right panel.',
      },
      {
        title: 'Review suggestions',
        description: 'Click on any suggestion card to highlight the matching text in your document. See the original and suggested versions side-by-side.',
      },
      {
        title: 'Accept or reject',
        description: 'Accept individual suggestions or use "Accept All" to apply everything at once. Your document updates in real-time.',
      },
      {
        title: 'Export your work',
        description: 'Save your changes, copy to clipboard, create a Google Doc, or send directly to Translate.',
      },
    ],
    tips: [
      { text: 'Click a suggestion card to highlight the matching text in your document' },
      { text: 'Use "Accept All" to quickly apply all suggestions at once' },
      { text: 'Send your proofread text directly to Translate for multi-language output' },
      { text: 'Toggle between Public and Private to control who can see your work' },
    ],
    relatedFeatures: [
      {
        id: 'translate',
        title: 'Translate',
        description: 'Translate your proofread content into multiple languages',
      },
    ],
  },

  translate: {
    id: 'translate',
    title: 'Translate',
    tagline: 'One source, many languages',
    heroIllustration: '/help/illustration-translate-hero.png',
    overview: 'Translate your text into multiple languages simultaneously while preserving rich text formatting. Edit translations as needed and export anywhere.',
    capabilities: [
      'Translate to multiple languages at once',
      'Rich text formatting preserved (bold, italic, lists)',
      'Import from Google Docs or PDF',
      'Edit translations after generation',
      'Built-in proofreading for translations',
      'Export to Google Docs or clipboard',
    ],
    workflow: [
      {
        title: 'Create or select a translation',
        description: 'Start a new translation project or select an existing one from the History panel.',
      },
      {
        title: 'Add your source text',
        description: 'Enter your content directly or import from Google Docs or PDF. Your formatting will be preserved.',
      },
      {
        title: 'Select target languages',
        description: 'Choose one or more target languages from the dropdown. You can translate to multiple languages simultaneously.',
      },
      {
        title: 'Run translation',
        description: 'Select an AI model and click "Translate". Each language appears in its own tab as it completes.',
      },
      {
        title: 'Review and edit',
        description: 'Switch between language tabs to review translations. Make edits directly in the output area if needed.',
      },
      {
        title: 'Proofread translations',
        description: 'Use the built-in proofreading feature to check and improve your translations.',
      },
      {
        title: 'Export your translations',
        description: 'Copy to clipboard, create a Google Doc, or share a link. Each language can be exported separately.',
      },
    ],
    tips: [
      { text: 'Select multiple languages to translate simultaneously' },
      { text: 'Your rich text formatting (bold, italic, lists) is preserved' },
      { text: 'Use the built-in proofreading to polish translations' },
      { text: 'Give feedback on translations to help improve quality' },
    ],
    relatedFeatures: [
      {
        id: 'proofread',
        title: 'Proofread',
        description: 'Polish your source text before translating',
      },
      {
        id: 'image-translate',
        title: 'Image Translation',
        description: 'Translate text within images',
      },
    ],
  },

  'image-translate': {
    id: 'image-translate',
    title: 'Image Translation',
    tagline: 'Translate text in images',
    heroIllustration: '/help/illustration-image-translate-hero.png',
    overview: 'Upload images containing text and translate them into different languages. The AI preserves the original layout, fonts, and styling while replacing the text.',
    capabilities: [
      'Translate text embedded in images',
      'Supports JPEG, PNG, GIF, WebP formats',
      'Multiple target languages per image',
      'Preserves original image layout and style',
      'Download translated images individually',
    ],
    workflow: [
      {
        title: 'Upload an image',
        description: 'Click "Upload Image" or select an existing image from History. Supports JPEG, PNG, GIF, and WebP formats.',
      },
      {
        title: 'Select target languages',
        description: 'Choose which languages you want to translate the image text into. You can select multiple languages.',
      },
      {
        title: 'Start translation',
        description: 'Click "Translate" to begin. The AI will detect text in your image and translate it while preserving the visual style.',
      },
      {
        title: 'View results',
        description: 'Each language appears in its own tab. Compare the original with translations by switching between tabs.',
      },
      {
        title: 'Download or retranslate',
        description: 'Download individual translated images or click "Retranslate" if you want to try again.',
      },
    ],
    tips: [
      { text: 'Works best with clear, readable text in images' },
      { text: 'The AI preserves image layout, fonts, and styling' },
      { text: 'Use "Retranslate" if results need refinement' },
      { text: 'Click on any image to view it full-size' },
    ],
    relatedFeatures: [
      {
        id: 'translate',
        title: 'Translate',
        description: 'Translate plain text documents',
      },
      {
        id: 'image-edit',
        title: 'Image Edit',
        description: 'Make AI-powered edits to images',
      },
    ],
  },

  'image-edit': {
    id: 'image-edit',
    title: 'Image Edit',
    tagline: 'AI-powered image editing',
    heroIllustration: '/help/illustration-image-edit-hero.png',
    overview: 'Edit images using AI with the help of drawing annotations. Mark areas, add arrows, and describe what you want changed. The AI understands your visual instructions.',
    capabilities: [
      'AI-powered image modifications',
      'Drawing tools: pen, arrow, circle, rectangle, text',
      'Color picker for annotations',
      'Multiple edit history per image',
      'Iterative editing (use results as new source)',
      'Bulk download and delete',
    ],
    workflow: [
      {
        title: 'Upload an image',
        description: 'Click "Upload" to add a new image, or select an existing session from History.',
      },
      {
        title: 'Annotate with drawing tools',
        description: 'Use the toolbar to draw arrows, circles, rectangles, or text on your image. These annotations guide the AI.',
      },
      {
        title: 'Write your instructions',
        description: 'Describe what changes you want in the prompt field. Be specific: "Remove the background" works better than "edit this".',
      },
      {
        title: 'Choose a model and apply',
        description: 'Select Gemini or OpenAI, then click "Apply Edit". The AI will process your request.',
      },
      {
        title: 'Review results',
        description: 'Results appear in the gallery below. Click any thumbnail to view it larger. The most recent edit is selected by default.',
      },
      {
        title: 'Iterate or download',
        description: 'Use "Use as Source" to continue editing from a result. Download individual images or select multiple for bulk actions.',
      },
    ],
    tips: [
      { text: 'Draw arrows and circles to show the AI exactly where to make changes' },
      { text: 'Be specific in your prompt: "Remove the background" works better than "edit this"' },
      { text: 'Use "Use as Source" to build on previous edits' },
      { text: 'Select multiple results with checkboxes for bulk download or delete' },
    ],
    relatedFeatures: [
      {
        id: 'image-translate',
        title: 'Image Translation',
        description: 'Translate text within images',
      },
    ],
  },

  settings: {
    id: 'settings',
    title: 'Administration',
    tagline: 'Configure and manage Babellion',
    heroIllustration: '/help/illustration-settings-hero.png',
    overview: 'Manage AI models, languages, proofreading rules, users, and system settings. View analytics to understand how Babellion is being used.',
    capabilities: [
      'Configure API keys for AI providers',
      'Manage AI models and set defaults',
      'Enable/disable translation languages',
      'Create proofreading rule categories and rules',
      'Manage user permissions',
      'Customize AI system prompts',
      'View usage analytics',
    ],
    workflow: [
      {
        title: 'API Keys',
        description: 'Configure your OpenAI, Anthropic, and Gemini API keys. These are securely stored and enable AI features.',
      },
      {
        title: 'Models',
        description: 'Add, edit, or remove AI models. Set a default model that will be pre-selected for users.',
      },
      {
        title: 'Languages',
        description: 'Enable or disable languages available for translation. Active languages appear in the language selector.',
      },
      {
        title: 'Proofreading Rules',
        description: 'Create categories (like Grammar, Style) and individual rules within them. Users select categories when proofreading.',
      },
      {
        title: 'Users',
        description: 'View all users and grant or revoke admin privileges. Admins can access this Settings page.',
      },
      {
        title: 'System Prompts',
        description: 'Customize the AI system prompts for translation, proofreading, and image translation to tune behavior.',
      },
      {
        title: 'Analytics',
        description: 'View usage statistics including translations, proofreadings, active users, and language popularity.',
      },
    ],
    tips: [
      { text: 'Only admin users can access the Settings page' },
      { text: 'API keys are encrypted and never displayed after saving' },
      { text: 'Disabling a language hides it from the selector but preserves existing translations' },
      { text: 'Analytics help you understand which features and languages are most popular' },
    ],
    relatedFeatures: [],
  },
};

/**
 * Get help content for a specific feature
 */
export function getHelpContent(featureId: FeatureId): FeatureHelp {
  return helpContent[featureId];
}

/**
 * Get the feature ID from a route path
 */
export function getFeatureIdFromPath(path: string): FeatureId | null {
  if (path.startsWith('/proofread')) return 'proofread';
  if (path.startsWith('/translate') && !path.startsWith('/image-translate')) return 'translate';
  if (path.startsWith('/image-translate')) return 'image-translate';
  if (path.startsWith('/image-edit')) return 'image-edit';
  if (path.startsWith('/settings')) return 'settings';
  return null;
}

/**
 * Welcome modal content - shorter version for first-time users
 */
export interface WelcomeContent {
  title: string;
  tagline: string;
  heroIllustration: string;
  description: string;
  highlights: string[];
}

export const welcomeContent: Record<FeatureId, WelcomeContent> = {
  proofread: {
    title: 'Welcome to Proofread',
    tagline: 'AI-powered text refinement',
    heroIllustration: '/help/illustration-proofread-hero.png',
    description: 'Get intelligent suggestions for grammar, style, and clarity. Review each suggestion and accept or reject with a single click.',
    highlights: [
      'Import from Google Docs or PDF',
      'Choose rule categories for focused feedback',
      'Click suggestions to highlight matching text',
      'Accept all or review one by one',
    ],
  },
  translate: {
    title: 'Welcome to Translate',
    tagline: 'One source, many languages',
    heroIllustration: '/help/illustration-translate-hero.png',
    description: 'Translate your text into multiple languages simultaneously while preserving rich text formatting.',
    highlights: [
      'Translate to multiple languages at once',
      'Formatting preserved (bold, italic, lists)',
      'Edit translations after generation',
      'Export to Google Docs or clipboard',
    ],
  },
  'image-translate': {
    title: 'Welcome to Image Translation',
    tagline: 'Translate text in images',
    heroIllustration: '/help/illustration-image-translate-hero.png',
    description: 'Upload images containing text and translate them into different languages while preserving the original design.',
    highlights: [
      'Supports JPEG, PNG, GIF, WebP',
      'Multiple languages per image',
      'Preserves layout and styling',
      'Download translated images',
    ],
  },
  'image-edit': {
    title: 'Welcome to Image Edit',
    tagline: 'AI-powered image editing',
    heroIllustration: '/help/illustration-image-edit-hero.png',
    description: 'Edit images using AI with the help of drawing annotations. Mark areas and describe what you want changed.',
    highlights: [
      'Draw to guide the AI',
      'Describe changes in plain language',
      'Build on results with "Use as Source"',
      'Multiple edits per image',
    ],
  },
  settings: {
    title: 'Welcome to Administration',
    tagline: 'Configure and manage Babellion',
    heroIllustration: '/help/illustration-settings-hero.png',
    description: 'Manage AI models, languages, proofreading rules, users, and view analytics.',
    highlights: [
      'Configure API keys for AI providers',
      'Manage models and languages',
      'Create proofreading rules',
      'View usage analytics',
    ],
  },
};

/**
 * Get welcome content for a specific feature
 */
export function getWelcomeContent(featureId: FeatureId): WelcomeContent {
  return welcomeContent[featureId];
}

