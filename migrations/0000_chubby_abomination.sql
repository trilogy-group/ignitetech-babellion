CREATE TYPE "public"."feedback_sentiment" AS ENUM('positive', 'negative');--> statement-breakpoint
CREATE TYPE "public"."proofread_status" AS ENUM('pending', 'proofreading', 'completed', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."proofreading_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."translation_status" AS ENUM('pending', 'translating', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "ai_models" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"model_identifier" varchar(100) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "ai_models_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(50) NOT NULL,
	"encrypted_key" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "api_keys_provider_unique" UNIQUE("provider")
);
--> statement-breakpoint
CREATE TABLE "languages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" varchar(100) NOT NULL,
	"native_name" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "languages_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "proofreading_outputs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proofreading_id" varchar NOT NULL,
	"results" jsonb NOT NULL,
	"model_id" varchar,
	"status" "proofreading_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "proofreading_rule_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "proofreading_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" varchar NOT NULL,
	"title" varchar(255) NOT NULL,
	"rule_text" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "proofreadings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" varchar(255) NOT NULL,
	"source_text" text NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"selected_categories" text[],
	"last_used_model_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "translation_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"translation_id" varchar NOT NULL,
	"translation_output_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"selected_text" text NOT NULL,
	"feedback_text" text NOT NULL,
	"sentiment" "feedback_sentiment" NOT NULL,
	"model_used" varchar(100),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "translation_outputs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"translation_id" varchar NOT NULL,
	"language_code" varchar(10) NOT NULL,
	"language_name" varchar(100) NOT NULL,
	"translated_text" text,
	"model_id" varchar,
	"translation_status" "translation_status" DEFAULT 'pending' NOT NULL,
	"proofread_status" "proofread_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" varchar(255) NOT NULL,
	"source_text" text NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"selected_languages" text[],
	"last_used_model_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"is_admin" boolean DEFAULT false NOT NULL,
	"google_access_token" text,
	"google_refresh_token" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "proofreading_outputs" ADD CONSTRAINT "proofreading_outputs_proofreading_id_proofreadings_id_fk" FOREIGN KEY ("proofreading_id") REFERENCES "public"."proofreadings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proofreading_outputs" ADD CONSTRAINT "proofreading_outputs_model_id_ai_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."ai_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proofreading_rules" ADD CONSTRAINT "proofreading_rules_category_id_proofreading_rule_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."proofreading_rule_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proofreadings" ADD CONSTRAINT "proofreadings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proofreadings" ADD CONSTRAINT "proofreadings_last_used_model_id_ai_models_id_fk" FOREIGN KEY ("last_used_model_id") REFERENCES "public"."ai_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_feedback" ADD CONSTRAINT "translation_feedback_translation_id_translations_id_fk" FOREIGN KEY ("translation_id") REFERENCES "public"."translations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_feedback" ADD CONSTRAINT "translation_feedback_translation_output_id_translation_outputs_id_fk" FOREIGN KEY ("translation_output_id") REFERENCES "public"."translation_outputs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_feedback" ADD CONSTRAINT "translation_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_outputs" ADD CONSTRAINT "translation_outputs_translation_id_translations_id_fk" FOREIGN KEY ("translation_id") REFERENCES "public"."translations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_outputs" ADD CONSTRAINT "translation_outputs_model_id_ai_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."ai_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_last_used_model_id_ai_models_id_fk" FOREIGN KEY ("last_used_model_id") REFERENCES "public"."ai_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");