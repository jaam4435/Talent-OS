-- Talent OS — Platform Core (PR-00)
-- Depends on: 001, 002, 005
-- Shared product registry, feature flags MVP, org-scoped config

-- =============================================================================
-- PRODUCT REGISTRY
-- =============================================================================
CREATE TABLE platform_product_registry (
  product_id      TEXT PRIMARY KEY CHECK (product_id IN ('talent_os', 'media_intel', 'ad_studio')),
  display_name    TEXT NOT NULL,
  enabled         BOOLEAN NOT NULL DEFAULT false,
  default_config  JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- FEATURE FLAGS (MVP — extended by Wave 0c)
-- =============================================================================
CREATE TABLE platform_feature_flags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      TEXT NOT NULL REFERENCES platform_product_registry(product_id) ON DELETE CASCADE,
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  flag_key        TEXT NOT NULL,
  enabled         BOOLEAN NOT NULL DEFAULT false,
  value           JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_feature_flags_scope_unique UNIQUE NULLS NOT DISTINCT (product_id, tenant_id, flag_key)
);

CREATE INDEX idx_platform_feature_flags_product ON platform_feature_flags(product_id, flag_key);
CREATE INDEX idx_platform_feature_flags_tenant ON platform_feature_flags(tenant_id, product_id)
  WHERE tenant_id IS NOT NULL;

-- =============================================================================
-- ORG-SCOPED CONFIG
-- =============================================================================
CREATE TABLE platform_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      TEXT NOT NULL REFERENCES platform_product_registry(product_id) ON DELETE CASCADE,
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  config_key      TEXT NOT NULL,
  config_value    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_config_scope_unique UNIQUE NULLS NOT DISTINCT (product_id, tenant_id, config_key)
);

CREATE INDEX idx_platform_config_product ON platform_config(product_id, config_key);
CREATE INDEX idx_platform_config_tenant ON platform_config(tenant_id, product_id)
  WHERE tenant_id IS NOT NULL;

-- =============================================================================
-- SEED PRODUCTS
-- =============================================================================
INSERT INTO platform_product_registry (product_id, display_name, enabled, default_config, metadata)
VALUES
  (
    'talent_os',
    'Talent OS',
    true,
    '{"ai":{"defaultProvider":"openai","maxConcurrentRequests":10}}'::jsonb,
    '{"description":"Multi-tenant talent marketplace and project platform"}'::jsonb
  ),
  (
    'media_intel',
    'Media Intelligence',
    false,
    '{}'::jsonb,
    '{"description":"Media analytics product — registered, not yet enabled"}'::jsonb
  ),
  (
    'ad_studio',
    'AI Ad Studio',
    false,
    '{}'::jsonb,
    '{"description":"AI advertising studio — registered, not yet enabled"}'::jsonb
  )
ON CONFLICT (product_id) DO NOTHING;

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE platform_product_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_products_read" ON platform_product_registry
  FOR SELECT TO authenticated
  USING (true);

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

COMMENT ON TABLE platform_product_registry IS 'Cross-product registry — talent_os, media_intel, ad_studio';
COMMENT ON TABLE platform_feature_flags IS 'Platform feature flags MVP — env > org > default; Wave 0c extends';
COMMENT ON TABLE platform_config IS 'Layered platform config — env > org > product default';
