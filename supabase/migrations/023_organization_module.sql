-- Talent OS — Organization Module (T-ORG)
-- Depends on: 001, 002, 006, 022
-- Tenants table is the workspace Organization root.

-- =============================================================================
-- 1. EXTEND TENANTS (ORGANIZATION)
-- =============================================================================
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_reference TEXT,
  ADD COLUMN IF NOT EXISTS primary_color TEXT,
  ADD COLUMN IF NOT EXISTS accent_color TEXT,
  ADD COLUMN IF NOT EXISTS business_hours JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(id) WHERE deleted_at IS NULL;

COMMENT ON COLUMN tenants.deleted_at IS 'Soft delete — organization hidden from active queries';
COMMENT ON COLUMN tenants.subscription_reference IS 'External billing provider reference (e.g. Stripe customer id)';
COMMENT ON COLUMN tenants.business_hours IS 'Weekly schedule JSON — see ORGANIZATION_MODULE.md';

-- =============================================================================
-- 2. SOFT DELETE ON MEMBERS
-- =============================================================================
ALTER TABLE tenant_members
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tenant_members_active
  ON tenant_members(tenant_id, status) WHERE deleted_at IS NULL;

-- =============================================================================
-- 3. DEPARTMENTS
-- =============================================================================
CREATE TABLE org_departments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL,
  description   TEXT,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT org_departments_slug_unique UNIQUE (tenant_id, slug)
);

CREATE INDEX idx_org_departments_tenant ON org_departments(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_org_departments_search ON org_departments USING gin(to_tsvector('simple', name));

-- =============================================================================
-- 4. TEAMS
-- =============================================================================
CREATE TABLE org_teams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  department_id   UUID REFERENCES org_departments(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  description     TEXT,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT org_teams_slug_unique UNIQUE (tenant_id, slug)
);

CREATE INDEX idx_org_teams_tenant ON org_teams(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_org_teams_department ON org_teams(department_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_org_teams_search ON org_teams USING gin(to_tsvector('simple', name));

-- =============================================================================
-- 5. TEAM MEMBERS
-- =============================================================================
CREATE TABLE org_team_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  team_id     UUID NOT NULL REFERENCES org_teams(id) ON DELETE CASCADE,
  member_id   UUID NOT NULL REFERENCES tenant_members(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT org_team_members_unique UNIQUE (team_id, member_id)
);

CREATE INDEX idx_org_team_members_team ON org_team_members(team_id);
CREATE INDEX idx_org_team_members_member ON org_team_members(member_id);

-- =============================================================================
-- 6. ORGANIZATION AUDIT LOGS
-- =============================================================================
CREATE TABLE organization_audit_logs (
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

CREATE INDEX idx_org_audit_tenant ON organization_audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_org_audit_entity ON organization_audit_logs(tenant_id, entity_type, entity_id);
CREATE INDEX idx_org_audit_action ON organization_audit_logs(tenant_id, action);

-- =============================================================================
-- 7. UPDATED_AT TRIGGERS
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_departments_updated ON org_departments;
CREATE TRIGGER trg_org_departments_updated
  BEFORE UPDATE ON org_departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_org_teams_updated ON org_teams;
CREATE TRIGGER trg_org_teams_updated
  BEFORE UPDATE ON org_teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 8. TENANT SOFT-DELETE FILTER (active orgs only for members)
-- =============================================================================
DROP POLICY IF EXISTS "tenants_select" ON tenants;
CREATE POLICY "tenants_select" ON tenants FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND id IN (SELECT public.user_tenant_ids())
  );

-- =============================================================================
-- 9. RLS — DEPARTMENTS, TEAMS, TEAM MEMBERS, AUDIT
-- =============================================================================
ALTER TABLE org_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_departments_select" ON org_departments FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "org_departments_manage" ON org_departments FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "org_teams_select" ON org_teams FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "org_teams_manage" ON org_teams FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "org_team_members_select" ON org_team_members FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "org_team_members_manage" ON org_team_members FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "org_audit_select" ON organization_audit_logs FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.admin_tenant_ids()));

CREATE POLICY "org_audit_insert" ON organization_audit_logs FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.admin_tenant_ids()));

-- Member visibility excludes soft-deleted rows
DROP POLICY IF EXISTS "tenant_members_select" ON tenant_members;
CREATE POLICY "tenant_members_select" ON tenant_members FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND tenant_id IN (SELECT public.user_tenant_ids())
  );

COMMENT ON TABLE org_departments IS 'Organization departments — scoped by tenant (organization)';
COMMENT ON TABLE org_teams IS 'Organization teams — optional department link';
COMMENT ON TABLE org_team_members IS 'Team membership linking tenant_members to org_teams';
COMMENT ON TABLE organization_audit_logs IS 'Immutable organization audit trail with before/after state';
