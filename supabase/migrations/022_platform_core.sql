-- Talent OS — Platform Core (PR-00, single-product)
-- Depends on: 001, 002, 005
-- Org-scoped feature flags and config for Talent OS only

-- =============================================================================
-- FEATURE FLAGS (MVP — tenant.settings fallback in application layer)
-- =============================================================================
CREATE TABLE platform_feature_flags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  flag_key        TEXT NOT NULL,
  enabled         BOOLEAN NOT NULL DEFAULT false,
  value           JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_feature_flags_scope_unique UNIQUE NULLS NOT DISTINCT (tenant_id, flag_key)
);

CREATE INDEX idx_platform_feature_flags_tenant ON platform_feature_flags(tenant_id, flag_key)
  WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_platform_feature_flags_platform ON platform_feature_flags(flag_key)
  WHERE tenant_id IS NULL;

-- =============================================================================
-- ORG-SCOPED CONFIG
-- =============================================================================
CREATE TABLE platform_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  config_key      TEXT NOT NULL,
  config_value    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_config_scope_unique UNIQUE NULLS NOT DISTINCT (tenant_id, config_key)
);

CREATE INDEX idx_platform_config_tenant ON platform_config(tenant_id, config_key)
  WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_platform_config_platform ON platform_config(config_key)
  WHERE tenant_id IS NULL;

-- Platform defaults for Talent OS AI routing
INSERT INTO platform_config (tenant_id, config_key, config_value)
VALUES (
  NULL,
  'ai',
  '{"defaultProvider":"openai","maxConcurrentRequests":10}'::jsonb
)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE platform_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_flags_read" ON platform_feature_flags
  FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "platform_flags_manage" ON platform_feature_flags
  FOR ALL TO authenticated
  USING (tenant_id IS NULL OR tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IS NULL OR tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "platform_config_read" ON platform_config
  FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "platform_config_manage" ON platform_config
  FOR ALL TO authenticated
  USING (tenant_id IS NULL OR tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IS NULL OR tenant_id IN (SELECT public.manager_tenant_ids()));

COMMENT ON TABLE platform_feature_flags IS 'Talent OS feature flags MVP — env > org > platform default > tenant.settings';
COMMENT ON TABLE platform_config IS 'Talent OS layered config — env > org > platform default';
