-- Core schema alignment: companies, client role, canonical views (users, talent_profiles)
-- Maps product concepts: users → profiles, talent_profiles → freelancers, companies → new table

-- =============================================================================
-- CLIENT ROLE
-- =============================================================================
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'client';

-- =============================================================================
-- COMPANIES (end-client organizations)
-- =============================================================================
CREATE TABLE IF NOT EXISTS companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  logo_url        TEXT,
  contact_email   TEXT,
  contact_name    TEXT,
  website         TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_companies_tenant ON companies(tenant_id);

-- Link client users to their company
ALTER TABLE tenant_members
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_members_company
  ON tenant_members(company_id) WHERE company_id IS NOT NULL;

-- Associate gigs/projects with a company record (replaces free-text client_name over time)
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_opportunities_company ON opportunities(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);

-- =============================================================================
-- CANONICAL VIEWS (API / documentation layer)
-- =============================================================================
CREATE OR REPLACE VIEW users AS
  SELECT
    id,
    email,
    full_name,
    avatar_url,
    phone,
    created_at,
    updated_at
  FROM profiles;

CREATE OR REPLACE VIEW talent_profiles AS
  SELECT
    id,
    tenant_id,
    user_id,
    email,
    full_name AS name,
    phone,
    discipline,
    skills,
    day_rate,
    currency,
    bio,
    portfolio_url,
    availability,
    internal_rating AS rating,
    tags,
    metadata,
    last_active_at,
    created_at,
    updated_at
  FROM freelancers;

-- =============================================================================
-- RLS HELPERS — CLIENT ACCESS
-- =============================================================================
CREATE OR REPLACE FUNCTION public.client_company_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM tenant_members
  WHERE user_id = auth.uid()
    AND status = 'active'
    AND role = 'client'
    AND company_id IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.is_client_of(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tenant_members
    WHERE tenant_id = p_tenant_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role = 'client'
  );
$$;

-- =============================================================================
-- COMPANIES RLS
-- =============================================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_select_manager" ON companies;
DROP POLICY IF EXISTS "companies_select_client" ON companies;
DROP POLICY IF EXISTS "companies_insert" ON companies;
DROP POLICY IF EXISTS "companies_update" ON companies;
DROP POLICY IF EXISTS "companies_delete" ON companies;

CREATE POLICY "companies_select_manager" ON companies FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "companies_select_client" ON companies FOR SELECT TO authenticated
  USING (id IN (SELECT public.client_company_ids()));

CREATE POLICY "companies_insert" ON companies FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "companies_update" ON companies FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "companies_delete" ON companies FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT public.admin_tenant_ids()));

-- =============================================================================
-- PROJECT / OPPORTUNITY RLS — CLIENT READ ACCESS
-- =============================================================================
DROP POLICY IF EXISTS "projects_select_client" ON projects;
CREATE POLICY "projects_select_client" ON projects FOR SELECT TO authenticated
  USING (
    company_id IN (SELECT public.client_company_ids())
    OR (
      company_id IS NULL
      AND tenant_id IN (
        SELECT tenant_id FROM tenant_members
        WHERE user_id = auth.uid() AND status = 'active' AND role = 'client'
      )
    )
  );

DROP POLICY IF EXISTS "opportunities_select_client" ON opportunities;
CREATE POLICY "opportunities_select_client" ON opportunities FOR SELECT TO authenticated
  USING (
    company_id IN (SELECT public.client_company_ids())
    OR (
      company_id IS NULL
      AND tenant_id IN (
        SELECT tenant_id FROM tenant_members
        WHERE user_id = auth.uid() AND status = 'active' AND role = 'client'
      )
    )
  );

-- =============================================================================
-- TRIGGERS
-- =============================================================================
DROP TRIGGER IF EXISTS trg_companies_updated_at ON companies;
CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Sync client_name from company when company_id is set
CREATE OR REPLACE FUNCTION public.sync_project_company_name()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    SELECT name INTO NEW.client_name FROM companies WHERE id = NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_company_name ON projects;
CREATE TRIGGER trg_project_company_name
  BEFORE INSERT OR UPDATE OF company_id ON projects
  FOR EACH ROW EXECUTE FUNCTION public.sync_project_company_name();

GRANT SELECT ON users, talent_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON companies TO authenticated;

COMMENT ON TABLE companies IS 'End-client organizations (maps to product concept: companies)';
COMMENT ON VIEW users IS 'Canonical user records (maps to profiles + auth.users)';
COMMENT ON VIEW talent_profiles IS 'Canonical talent profiles (maps to freelancers)';

-- Allow client role on tenant_members (extends enum from above)
ALTER TABLE tenant_members DROP CONSTRAINT IF EXISTS tenant_members_role_check;
ALTER TABLE tenant_members ADD CONSTRAINT tenant_members_role_check
  CHECK (role::text = ANY (ARRAY['admin', 'talent_manager', 'freelancer', 'client']));

ALTER TABLE member_invites DROP CONSTRAINT IF EXISTS chk_member_invites_role;
ALTER TABLE member_invites ADD CONSTRAINT chk_member_invites_role
  CHECK (role::text = ANY (ARRAY['admin', 'talent_manager', 'freelancer', 'client']));
