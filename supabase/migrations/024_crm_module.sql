-- Talent OS — CRM Module (demand management)
-- Depends on: 001, 002, 012, 023
-- Extends companies; adds leads, contacts, deals, pipeline, contracts, notes, attachments, activities

-- =============================================================================
-- ENUMS
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE crm_lead_status AS ENUM ('new', 'contacted', 'qualified', 'unqualified', 'converted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE crm_company_status AS ENUM ('prospect', 'active', 'client', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE crm_activity_type AS ENUM ('call', 'email', 'meeting', 'note', 'task', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE crm_contract_status AS ENUM ('draft', 'sent', 'signed', 'expired', 'canceled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE crm_stage_outcome AS ENUM ('open', 'won', 'lost');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- EXTEND COMPANIES
-- =============================================================================
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status crm_company_status NOT NULL DEFAULT 'prospect',
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS ai_context JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(tenant_id, status) WHERE deleted_at IS NULL;

-- Link talent opportunities to CRM deals (optional)
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS crm_deal_id UUID;

-- =============================================================================
-- PIPELINE STAGES (Kanban columns)
-- =============================================================================
CREATE TABLE crm_pipeline_stages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL,
  sort_order    INT NOT NULL DEFAULT 0,
  outcome       crm_stage_outcome NOT NULL DEFAULT 'open',
  color         TEXT,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT crm_pipeline_stages_slug_unique UNIQUE (tenant_id, slug)
);

CREATE INDEX idx_crm_pipeline_stages_tenant ON crm_pipeline_stages(tenant_id, sort_order)
  WHERE deleted_at IS NULL;

-- =============================================================================
-- LEADS (demand capture — distinct from talent opportunities)
-- =============================================================================
CREATE TABLE crm_leads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  source                TEXT,
  status                crm_lead_status NOT NULL DEFAULT 'new',
  company_id            UUID REFERENCES companies(id) ON DELETE SET NULL,
  contact_id            UUID,
  owner_id              UUID REFERENCES profiles(id) ON DELETE SET NULL,
  value_estimate        NUMERIC(12, 2),
  currency              CHAR(3) NOT NULL DEFAULT 'USD',
  description           TEXT,
  converted_at          TIMESTAMPTZ,
  converted_company_id  UUID REFERENCES companies(id) ON DELETE SET NULL,
  converted_deal_id     UUID,
  ai_context            JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_leads_tenant ON crm_leads(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_crm_leads_search ON crm_leads USING gin(to_tsvector('simple', title));

-- =============================================================================
-- CONTACTS
-- =============================================================================
CREATE TABLE crm_contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id    UUID REFERENCES companies(id) ON DELETE SET NULL,
  first_name    TEXT NOT NULL,
  last_name     TEXT,
  email         TEXT,
  phone         TEXT,
  job_title     TEXT,
  is_primary    BOOLEAN NOT NULL DEFAULT false,
  ai_context    JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_contacts_tenant ON crm_contacts(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_crm_contacts_company ON crm_contacts(company_id) WHERE deleted_at IS NULL;

ALTER TABLE crm_leads
  ADD CONSTRAINT crm_leads_contact_fk
  FOREIGN KEY (contact_id) REFERENCES crm_contacts(id) ON DELETE SET NULL;

-- =============================================================================
-- DEALS (sales pipeline)
-- =============================================================================
CREATE TABLE crm_deals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  value               NUMERIC(12, 2),
  currency            CHAR(3) NOT NULL DEFAULT 'USD',
  stage_id            UUID NOT NULL REFERENCES crm_pipeline_stages(id),
  company_id          UUID REFERENCES companies(id) ON DELETE SET NULL,
  lead_id             UUID REFERENCES crm_leads(id) ON DELETE SET NULL,
  opportunity_id      UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  owner_id            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  expected_close_date DATE,
  probability         INT CHECK (probability >= 0 AND probability <= 100),
  ai_context          JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_deals_tenant ON crm_deals(tenant_id, stage_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_crm_deals_company ON crm_deals(company_id) WHERE deleted_at IS NULL;

ALTER TABLE crm_leads
  ADD CONSTRAINT crm_leads_converted_deal_fk
  FOREIGN KEY (converted_deal_id) REFERENCES crm_deals(id) ON DELETE SET NULL;

ALTER TABLE opportunities
  ADD CONSTRAINT opportunities_crm_deal_fk
  FOREIGN KEY (crm_deal_id) REFERENCES crm_deals(id) ON DELETE SET NULL;

-- =============================================================================
-- CONTRACTS
-- =============================================================================
CREATE TABLE crm_contracts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  deal_id       UUID REFERENCES crm_deals(id) ON DELETE SET NULL,
  company_id    UUID REFERENCES companies(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  status        crm_contract_status NOT NULL DEFAULT 'draft',
  value         NUMERIC(12, 2),
  currency      CHAR(3) NOT NULL DEFAULT 'USD',
  starts_on     DATE,
  ends_on       DATE,
  signed_at     TIMESTAMPTZ,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_contracts_tenant ON crm_contracts(tenant_id, status) WHERE deleted_at IS NULL;

-- =============================================================================
-- NOTES (polymorphic)
-- =============================================================================
CREATE TABLE crm_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type   TEXT NOT NULL,
  entity_id     UUID NOT NULL,
  author_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  body          TEXT NOT NULL,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_notes_entity ON crm_notes(tenant_id, entity_type, entity_id) WHERE deleted_at IS NULL;

-- =============================================================================
-- ATTACHMENTS (polymorphic)
-- =============================================================================
CREATE TABLE crm_attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type   TEXT NOT NULL,
  entity_id     UUID NOT NULL,
  uploaded_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  file_name     TEXT NOT NULL,
  file_path     TEXT NOT NULL,
  mime_type     TEXT,
  size_bytes    BIGINT,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_attachments_entity ON crm_attachments(tenant_id, entity_type, entity_id) WHERE deleted_at IS NULL;

-- =============================================================================
-- ACTIVITIES
-- =============================================================================
CREATE TABLE crm_activities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type   TEXT NOT NULL,
  entity_id     UUID NOT NULL,
  activity_type crm_activity_type NOT NULL DEFAULT 'other',
  subject       TEXT NOT NULL,
  description   TEXT,
  actor_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_activities_entity ON crm_activities(tenant_id, entity_type, entity_id, occurred_at DESC)
  WHERE deleted_at IS NULL;

-- =============================================================================
-- CRM AUDIT LOGS
-- =============================================================================
CREATE TABLE crm_audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     TEXT NOT NULL,
  before_state  JSONB,
  after_state   JSONB,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_audit_tenant ON crm_audit_logs(tenant_id, created_at DESC);

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================
DROP TRIGGER IF EXISTS trg_crm_pipeline_stages_updated ON crm_pipeline_stages;
CREATE TRIGGER trg_crm_pipeline_stages_updated
  BEFORE UPDATE ON crm_pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_crm_leads_updated ON crm_leads;
CREATE TRIGGER trg_crm_leads_updated
  BEFORE UPDATE ON crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_crm_contacts_updated ON crm_contacts;
CREATE TRIGGER trg_crm_contacts_updated
  BEFORE UPDATE ON crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_crm_deals_updated ON crm_deals;
CREATE TRIGGER trg_crm_deals_updated
  BEFORE UPDATE ON crm_deals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_crm_contracts_updated ON crm_contracts;
CREATE TRIGGER trg_crm_contracts_updated
  BEFORE UPDATE ON crm_contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_crm_notes_updated ON crm_notes;
CREATE TRIGGER trg_crm_notes_updated
  BEFORE UPDATE ON crm_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- DEFAULT PIPELINE STAGES (per tenant via seed function)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.seed_crm_pipeline_stages(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO crm_pipeline_stages (tenant_id, name, slug, sort_order, outcome, color)
  VALUES
    (p_tenant_id, 'Qualification', 'qualification', 10, 'open', '#6366f1'),
    (p_tenant_id, 'Proposal', 'proposal', 20, 'open', '#8b5cf6'),
    (p_tenant_id, 'Negotiation', 'negotiation', 30, 'open', '#a855f7'),
    (p_tenant_id, 'Won', 'won', 40, 'won', '#22c55e'),
    (p_tenant_id, 'Lost', 'lost', 50, 'lost', '#ef4444')
  ON CONFLICT (tenant_id, slug) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_crm_pipeline_stages(UUID) TO authenticated;

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_audit_logs ENABLE ROW LEVEL SECURITY;

-- Managers: full CRM access within tenant
CREATE POLICY "crm_stages_select" ON crm_pipeline_stages FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "crm_stages_manage" ON crm_pipeline_stages FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "crm_leads_select" ON crm_leads FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "crm_leads_manage" ON crm_leads FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "crm_contacts_select" ON crm_contacts FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "crm_contacts_manage" ON crm_contacts FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "crm_deals_select" ON crm_deals FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "crm_deals_manage" ON crm_deals FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "crm_contracts_select" ON crm_contracts FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "crm_contracts_manage" ON crm_contracts FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "crm_notes_select" ON crm_notes FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "crm_notes_manage" ON crm_notes FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "crm_attachments_select" ON crm_attachments FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "crm_attachments_manage" ON crm_attachments FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "crm_activities_select" ON crm_activities FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "crm_activities_manage" ON crm_activities FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "crm_audit_select" ON crm_audit_logs FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "crm_audit_insert" ON crm_audit_logs FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

-- Companies soft-delete filter for managers
DROP POLICY IF EXISTS "companies_select_manager" ON companies;
CREATE POLICY "companies_select_manager" ON companies FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND tenant_id IN (SELECT public.manager_tenant_ids())
  );

DROP POLICY IF EXISTS "companies_select_client" ON companies;
CREATE POLICY "companies_select_client" ON companies FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND id IN (SELECT public.client_company_ids())
  );

COMMENT ON TABLE crm_leads IS 'Sales/demand leads — distinct from talent opportunities';
COMMENT ON TABLE crm_deals IS 'Sales pipeline deals — Kanban via stage_id';
COMMENT ON TABLE crm_pipeline_stages IS 'Configurable pipeline stages per tenant';
