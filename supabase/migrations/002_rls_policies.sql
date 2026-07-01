-- Talent OS — Row-Level Security Policies
-- Depends on: 001_initial_schema.sql

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get all tenant IDs the current user belongs to
CREATE OR REPLACE FUNCTION auth.user_tenant_ids()
RETURNS SETOF UUID AS $$
  SELECT tenant_id
  FROM tenant_members
  WHERE user_id = auth.uid()
    AND status = 'active';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get tenant IDs where user has admin or talent_manager role
CREATE OR REPLACE FUNCTION auth.manager_tenant_ids()
RETURNS SETOF UUID AS $$
  SELECT tenant_id
  FROM tenant_members
  WHERE user_id = auth.uid()
    AND status = 'active'
    AND role IN ('admin', 'talent_manager');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get tenant IDs where user is admin
CREATE OR REPLACE FUNCTION auth.admin_tenant_ids()
RETURNS SETOF UUID AS $$
  SELECT tenant_id
  FROM tenant_members
  WHERE user_id = auth.uid()
    AND status = 'active'
    AND role = 'admin';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get freelancer IDs linked to current user
CREATE OR REPLACE FUNCTION auth.user_freelancer_ids()
RETURNS SETOF UUID AS $$
  SELECT id
  FROM freelancers
  WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if user has a specific role in a tenant
CREATE OR REPLACE FUNCTION auth.has_tenant_role(p_tenant_id UUID, p_roles user_role[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_members
    WHERE tenant_id = p_tenant_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role = ANY(p_roles)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =============================================================================
-- ENABLE RLS ON ALL TABLES
-- =============================================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE freelancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- TENANTS
-- =============================================================================
CREATE POLICY "tenants_select" ON tenants FOR SELECT
  USING (id IN (SELECT auth.user_tenant_ids()));

CREATE POLICY "tenants_update" ON tenants FOR UPDATE
  USING (id IN (SELECT auth.admin_tenant_ids()));

-- =============================================================================
-- PROFILES
-- =============================================================================
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR id IN (
      SELECT tm.user_id FROM tenant_members tm
      WHERE tm.tenant_id IN (SELECT auth.user_tenant_ids())
    )
  );

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- =============================================================================
-- TENANT MEMBERS
-- =============================================================================
CREATE POLICY "tenant_members_select" ON tenant_members FOR SELECT
  USING (tenant_id IN (SELECT auth.user_tenant_ids()));

CREATE POLICY "tenant_members_insert" ON tenant_members FOR INSERT
  WITH CHECK (tenant_id IN (SELECT auth.admin_tenant_ids()));

CREATE POLICY "tenant_members_update" ON tenant_members FOR UPDATE
  USING (tenant_id IN (SELECT auth.admin_tenant_ids()));

CREATE POLICY "tenant_members_delete" ON tenant_members FOR DELETE
  USING (tenant_id IN (SELECT auth.admin_tenant_ids()));

-- =============================================================================
-- FREELANCERS
-- =============================================================================
CREATE POLICY "freelancers_select_manager" ON freelancers FOR SELECT
  USING (tenant_id IN (SELECT auth.manager_tenant_ids()));

CREATE POLICY "freelancers_select_own" ON freelancers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "freelancers_insert" ON freelancers FOR INSERT
  WITH CHECK (tenant_id IN (SELECT auth.manager_tenant_ids()));

CREATE POLICY "freelancers_update_manager" ON freelancers FOR UPDATE
  USING (tenant_id IN (SELECT auth.manager_tenant_ids()));

CREATE POLICY "freelancers_update_own" ON freelancers FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    -- Freelancers cannot modify manager-only fields (enforced at API layer)
  );

CREATE POLICY "freelancers_delete" ON freelancers FOR DELETE
  USING (tenant_id IN (SELECT auth.manager_tenant_ids()));

-- =============================================================================
-- OPPORTUNITIES
-- =============================================================================
CREATE POLICY "opportunities_select_manager" ON opportunities FOR SELECT
  USING (tenant_id IN (SELECT auth.manager_tenant_ids()));

CREATE POLICY "opportunities_select_freelancer" ON opportunities FOR SELECT
  USING (
    id IN (
      SELECT opportunity_id FROM opportunity_recipients
      WHERE freelancer_id IN (SELECT auth.user_freelancer_ids())
    )
  );

CREATE POLICY "opportunities_insert" ON opportunities FOR INSERT
  WITH CHECK (tenant_id IN (SELECT auth.manager_tenant_ids()));

CREATE POLICY "opportunities_update" ON opportunities FOR UPDATE
  USING (tenant_id IN (SELECT auth.manager_tenant_ids()));

CREATE POLICY "opportunities_delete" ON opportunities FOR DELETE
  USING (tenant_id IN (SELECT auth.manager_tenant_ids()));

-- =============================================================================
-- OPPORTUNITY RECIPIENTS
-- =============================================================================
CREATE POLICY "opp_recipients_select_manager" ON opportunity_recipients FOR SELECT
  USING (tenant_id IN (SELECT auth.manager_tenant_ids()));

CREATE POLICY "opp_recipients_select_freelancer" ON opportunity_recipients FOR SELECT
  USING (freelancer_id IN (SELECT auth.user_freelancer_ids()));

CREATE POLICY "opp_recipients_insert" ON opportunity_recipients FOR INSERT
  WITH CHECK (tenant_id IN (SELECT auth.manager_tenant_ids()));

CREATE POLICY "opp_recipients_update_manager" ON opportunity_recipients FOR UPDATE
  USING (tenant_id IN (SELECT auth.manager_tenant_ids()));

CREATE POLICY "opp_recipients_update_freelancer" ON opportunity_recipients FOR UPDATE
  USING (freelancer_id IN (SELECT auth.user_freelancer_ids()))
  WITH CHECK (freelancer_id IN (SELECT auth.user_freelancer_ids()));

-- =============================================================================
-- SHORTLISTS
-- =============================================================================
CREATE POLICY "shortlists_select" ON shortlists FOR SELECT
  USING (tenant_id IN (SELECT auth.manager_tenant_ids()));

CREATE POLICY "shortlists_insert" ON shortlists FOR INSERT
  WITH CHECK (tenant_id IN (SELECT auth.manager_tenant_ids()));

CREATE POLICY "shortlists_update" ON shortlists FOR UPDATE
  USING (tenant_id IN (SELECT auth.manager_tenant_ids()));

-- =============================================================================
-- SHORTLIST ITEMS
-- =============================================================================
CREATE POLICY "shortlist_items_select" ON shortlist_items FOR SELECT
  USING (tenant_id IN (SELECT auth.manager_tenant_ids()));

CREATE POLICY "shortlist_items_insert" ON shortlist_items FOR INSERT
  WITH CHECK (tenant_id IN (SELECT auth.manager_tenant_ids()));

CREATE POLICY "shortlist_items_update" ON shortlist_items FOR UPDATE
  USING (tenant_id IN (SELECT auth.manager_tenant_ids()));

CREATE POLICY "shortlist_items_delete" ON shortlist_items FOR DELETE
  USING (tenant_id IN (SELECT auth.manager_tenant_ids()));

-- =============================================================================
-- PROJECTS
-- =============================================================================
CREATE POLICY "projects_select_manager" ON projects FOR SELECT
  USING (tenant_id IN (SELECT auth.manager_tenant_ids()));

CREATE POLICY "projects_select_freelancer" ON projects FOR SELECT
  USING (freelancer_id IN (SELECT auth.user_freelancer_ids()));

CREATE POLICY "projects_insert" ON projects FOR INSERT
  WITH CHECK (tenant_id IN (SELECT auth.manager_tenant_ids()));

CREATE POLICY "projects_update_manager" ON projects FOR UPDATE
  USING (tenant_id IN (SELECT auth.manager_tenant_ids()));

CREATE POLICY "projects_update_freelancer" ON projects FOR UPDATE
  USING (freelancer_id IN (SELECT auth.user_freelancer_ids()))
  WITH CHECK (freelancer_id IN (SELECT auth.user_freelancer_ids()));

-- =============================================================================
-- MILESTONES
-- =============================================================================
CREATE POLICY "milestones_select_manager" ON milestones FOR SELECT
  USING (tenant_id IN (SELECT auth.manager_tenant_ids()));

CREATE POLICY "milestones_select_freelancer" ON milestones FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE freelancer_id IN (SELECT auth.user_freelancer_ids())
    )
  );

CREATE POLICY "milestones_insert" ON milestones FOR INSERT
  WITH CHECK (tenant_id IN (SELECT auth.manager_tenant_ids()));

CREATE POLICY "milestones_update_manager" ON milestones FOR UPDATE
  USING (tenant_id IN (SELECT auth.manager_tenant_ids()));

CREATE POLICY "milestones_update_freelancer" ON milestones FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE freelancer_id IN (SELECT auth.user_freelancer_ids())
    )
  );

-- =============================================================================
-- PAYMENTS
-- =============================================================================
CREATE POLICY "payments_select_manager" ON payments FOR SELECT
  USING (tenant_id IN (SELECT auth.manager_tenant_ids()));

CREATE POLICY "payments_select_freelancer" ON payments FOR SELECT
  USING (freelancer_id IN (SELECT auth.user_freelancer_ids()));

CREATE POLICY "payments_insert" ON payments FOR INSERT
  WITH CHECK (tenant_id IN (SELECT auth.manager_tenant_ids()));

CREATE POLICY "payments_update_admin" ON payments FOR UPDATE
  USING (tenant_id IN (SELECT auth.admin_tenant_ids()));

CREATE POLICY "payments_update_manager_approve" ON payments FOR UPDATE
  USING (
    tenant_id IN (SELECT auth.manager_tenant_ids())
    AND status = 'pending'
  );

-- =============================================================================
-- ACTIVITY LOGS
-- =============================================================================
CREATE POLICY "activity_logs_select_manager" ON activity_logs FOR SELECT
  USING (tenant_id IN (SELECT auth.manager_tenant_ids()));

CREATE POLICY "activity_logs_select_freelancer" ON activity_logs FOR SELECT
  USING (
    entity_type = 'project'
    AND entity_id IN (
      SELECT id FROM projects
      WHERE freelancer_id IN (SELECT auth.user_freelancer_ids())
    )
  );

CREATE POLICY "activity_logs_insert" ON activity_logs FOR INSERT
  WITH CHECK (tenant_id IN (SELECT auth.user_tenant_ids()));

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON notifications FOR INSERT
  WITH CHECK (tenant_id IN (SELECT auth.user_tenant_ids()));

-- =============================================================================
-- WHATSAPP MESSAGES
-- =============================================================================
CREATE POLICY "wa_messages_select_manager" ON whatsapp_messages FOR SELECT
  USING (tenant_id IN (SELECT auth.manager_tenant_ids()));

CREATE POLICY "wa_messages_insert" ON whatsapp_messages FOR INSERT
  WITH CHECK (tenant_id IN (SELECT auth.manager_tenant_ids()));

-- =============================================================================
-- INTEGRATION CONFIGS
-- =============================================================================
CREATE POLICY "integration_configs_select" ON integration_configs FOR SELECT
  USING (tenant_id IN (SELECT auth.admin_tenant_ids()));

CREATE POLICY "integration_configs_insert" ON integration_configs FOR INSERT
  WITH CHECK (tenant_id IN (SELECT auth.admin_tenant_ids()));

CREATE POLICY "integration_configs_update" ON integration_configs FOR UPDATE
  USING (tenant_id IN (SELECT auth.admin_tenant_ids()));

CREATE POLICY "integration_configs_delete" ON integration_configs FOR DELETE
  USING (tenant_id IN (SELECT auth.admin_tenant_ids()));

-- =============================================================================
-- SERVICE ROLE BYPASS
-- Note: service_role key bypasses RLS automatically in Supabase.
-- Used by n8n webhooks and server-side API routes.
-- =============================================================================
