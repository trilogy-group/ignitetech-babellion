# Babellion - AI Translation Platform

## Overview

Babellion is a professional AI-powered translation platform that enables users to translate marketing content and other text into multiple languages using various AI models (GPT-5, Claude, etc.). The application features a modern SaaS dashboard aesthetic with a three-panel layout for efficient translation workflows, translation history management, and multi-language output handling.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18 with TypeScript for type-safe component development
- Vite for fast development and optimized production builds
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and data fetching

**UI Component System:**
- Shadcn UI component library (New York style variant)
- Radix UI primitives for accessible, unstyled component foundations
- Tailwind CSS for utility-first styling with custom design tokens
- Class Variance Authority (CVA) for component variant management
- Custom theme system supporting light/dark modes

**Design System:**
- Three-panel desktop layout: Translation History (left sidebar, 20rem fixed), Input panel (center, flexible), Output panel (right, flexible)
- Typography: Inter font for UI, JetBrains Mono for technical content
- Spacing system based on Tailwind units (2, 4, 6, 8)
- Inspired by Linear, Vercel, and Notion design aesthetics
- Responsive breakpoints with mobile-first approach

**State Management Pattern:**
- React Query for server state (translations, models, languages, settings)
- Local React state for UI interactions (dialogs, forms, active tabs)
- Context API for theme management
- Session-based authentication state

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript running on Node.js
- ESM module system
- Development: tsx for hot-reloading TypeScript execution
- Production: esbuild for bundled, optimized server code

**API Design:**
- RESTful API endpoints under `/api` prefix
- Route categories:
  - `/api/auth/*` - Authentication and user management
  - `/api/translations/*` - Translation CRUD operations
  - `/api/translation-outputs/*` - Translation output management
  - `/api/models/*` - AI model configuration (admin only)
  - `/api/languages/*` - Language configuration (admin only)
  - `/api/settings/*` - System settings (admin only)
  - `/api/api-keys/*` - API key management for AI providers (admin only)

**Middleware Stack:**
- Express session management with PostgreSQL session store
- JSON body parsing with raw body preservation
- Custom request logging for API endpoints
- Authentication middleware (isAuthenticated, isAdmin)
- CORS and security headers

**Security Measures:**
- AES-256-CBC encryption for API keys stored in database
- Session-based authentication using connect-pg-simple
- HTTP-only secure cookies for session management
- Environment variable validation for required secrets (DATABASE_URL, SESSION_SECRET/ENCRYPTION_KEY)
- Admin-only routes protected with role-based middleware

### Data Storage

**Database:**
- PostgreSQL via Neon serverless with WebSocket support
- Drizzle ORM for type-safe database queries and schema management
- Connection pooling using @neondatabase/serverless Pool

**Schema Design:**
- `sessions` - Express session storage (required for authentication)
- `users` - User profiles with admin flag, email, name, profile image
- `translations` - Translation projects with title, source text, user ownership
- `translationOutputs` - Individual language outputs per translation with AI model tracking
- `aiModels` - Available AI models with provider, identifier, default/active flags
- `languages` - Supported languages with codes, names, native names
- `settings` - System-wide configuration key-value store
- `apiKeys` - Encrypted API keys for AI providers (OpenAI, Anthropic)

**Data Relationships:**
- Users → Translations (one-to-many with cascade delete)
- Translations → TranslationOutputs (one-to-many with cascade delete)
- TranslationOutputs reference AiModels and Languages (foreign keys)

**Migration Strategy:**
- Drizzle Kit for schema migrations
- Migration files stored in `/migrations` directory
- Schema source of truth in `shared/schema.ts`

### External Dependencies

**AI Translation Services:**
- OpenAI API (GPT-5, GPT-5 Mini models)
  - SDK: `openai` npm package
  - Authentication via encrypted API keys
  - System prompts customizable per translation
- Anthropic API (Claude 4.5 Sonnet model)
  - SDK: `@anthropic-ai/sdk`
  - Authentication via encrypted API keys
  - System prompts customizable per translation

**Authentication Provider:**
- Replit Auth via OpenID Connect (OIDC)
  - Provider: `openid-client` with Passport.js strategy
  - Session-based authentication flow
  - User claims include sub (user ID), email, name, profile image
  - Token refresh mechanism with access/refresh tokens
  - Environment variables: ISSUER_URL, REPL_ID, SESSION_SECRET

**Database Service:**
- Neon PostgreSQL Serverless
  - Package: `@neondatabase/serverless` with WebSocket support
  - Connection via DATABASE_URL environment variable
  - Required WebSocket constructor for serverless environment
  - Auto-provisioned through Replit database integration

**Session Storage:**
- PostgreSQL-backed sessions via `connect-pg-simple`
  - 7-day session TTL
  - Automatic session table management
  - Integrated with Express session middleware

**Development Tools:**
- Replit-specific plugins for Vite:
  - Runtime error overlay
  - Cartographer (code navigation)
  - Dev banner
- These plugins are conditionally loaded only in non-production Replit environments

**Type Safety:**
- Zod for runtime schema validation
  - API request validation
  - Database insert schema validation via drizzle-zod
  - Shared type definitions between client and server

**Font Delivery:**
- Google Fonts CDN for web fonts (Inter, DM Sans, Fira Code, Geist Mono, Architects Daughter)
- Preconnect optimization for faster font loading