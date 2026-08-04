-- Talent OS — Extend ai_requests for full provider tracking and prompt versioning
-- Depends on: 005 (ai_requests, ai_provider enum)

-- =============================================================================
-- EXTEND PROVIDER ENUM
-- =============================================================================
DO $$ BEGIN
  ALTER TYPE ai_provider ADD VALUE IF NOT EXISTS 'gemini';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE ai_provider ADD VALUE IF NOT EXISTS 'openrouter';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE ai_provider ADD VALUE IF NOT EXISTS 'azure_openai';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE ai_provider ADD VALUE IF NOT EXISTS 'mock';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- NEW COLUMNS
-- =============================================================================
ALTER TABLE ai_requests
  ADD COLUMN IF NOT EXISTS product_id TEXT NOT NULL DEFAULT 'talent_os',
  ADD COLUMN IF NOT EXISTS prompt_version TEXT;

CREATE INDEX IF NOT EXISTS idx_ai_requests_product
  ON ai_requests(tenant_id, product_id, created_at DESC);

COMMENT ON COLUMN ai_requests.product_id IS 'Product attribution — always talent_os in this repo';
COMMENT ON COLUMN ai_requests.prompt_version IS 'Prompt template version used for this request';
