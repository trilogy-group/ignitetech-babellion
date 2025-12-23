-- Add performance metrics columns for AI operations tracking
-- Only populated on successful completion (not on error/timeout)

-- Translation outputs: track translation and proofreading metrics separately
ALTER TABLE "translation_outputs" ADD COLUMN IF NOT EXISTS "translation_duration_ms" integer;
ALTER TABLE "translation_outputs" ADD COLUMN IF NOT EXISTS "translation_output_tokens" integer;
ALTER TABLE "translation_outputs" ADD COLUMN IF NOT EXISTS "proofread_duration_ms" integer;
ALTER TABLE "translation_outputs" ADD COLUMN IF NOT EXISTS "proofread_output_tokens" integer;

-- Proofreading outputs: track proofreading metrics
ALTER TABLE "proofreading_outputs" ADD COLUMN IF NOT EXISTS "duration_ms" integer;
ALTER TABLE "proofreading_outputs" ADD COLUMN IF NOT EXISTS "output_tokens" integer;

-- Image translation outputs: track image translation metrics
ALTER TABLE "image_translation_outputs" ADD COLUMN IF NOT EXISTS "duration_ms" integer;
ALTER TABLE "image_translation_outputs" ADD COLUMN IF NOT EXISTS "output_tokens" integer;

-- Image edit outputs: track image edit metrics
ALTER TABLE "image_edit_outputs" ADD COLUMN IF NOT EXISTS "duration_ms" integer;
ALTER TABLE "image_edit_outputs" ADD COLUMN IF NOT EXISTS "output_tokens" integer;

