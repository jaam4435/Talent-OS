-- Talent OS — Talent Marketplace (Sprint 24)
-- Depends on: 001–036
-- Feature-flagged public read surface; default off via platform_feature_flags

-- =============================================================================
-- 1. FREELANCERS — marketplace eligibility columns
-- =============================================================================
ALTER TABLE freelancers
  ADD COLUMN IF NOT EXISTS marketplace_visible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketplace_published_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_freelancers_marketplace_visible
  ON freelancers (marketplace_visible, profile_completeness DESC)
  WHERE marketplace_visible = true AND deleted_at IS NULL;

-- =============================================================================
-- 2. PUBLIC READ SURFACE — field allowlist view (no PII columns)
-- =============================================================================
CREATE OR REPLACE VIEW talent_marketplace_profiles AS
SELECT
  id,
  discipline,
  skills,
  tags,
  bio,
  portfolio_url,
  timezone,
  employment_type,
  languages,
  availability,
  profile_completeness,
  ai_summary,
  marketplace_published_at,
  updated_at
FROM freelancers
WHERE marketplace_visible = true
  AND deleted_at IS NULL;

COMMENT ON VIEW talent_marketplace_profiles IS
  'ACL read surface for public marketplace. Application layer anonymizes display names; no email/phone/tenant/internal fields.';

-- =============================================================================
-- 3. PLATFORM FEATURE FLAG — default off
-- =============================================================================
INSERT INTO platform_feature_flags (flag_key, enabled, tenant_id)
VALUES ('marketplace_enabled', false, NULL)
ON CONFLICT (tenant_id, flag_key) DO NOTHING;

COMMENT ON COLUMN freelancers.marketplace_visible IS
  'Manager-controlled eligibility for public marketplace discovery (Sprint 24).';
