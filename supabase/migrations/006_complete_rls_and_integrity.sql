-- Talent OS — Complete RLS, Integrity Constraints & Schema Completions
-- Depends on: 001–005
-- Fixes: auth-schema helpers → public, tenant consistency, missing policies

-- =============================================================================
-- 1. AUTH HELPER FUNCTIONS (public schema — Supabase best practice)
-- =============================================================================

-- Drop auth-schema helpers if they exist (from 002); recreate in public
DROP FUNCTION IF EXISTS auth.has_tenant_role(UUID, user_role[]);
DROP FUNCTION IF EXISTS auth.user_freelancer_ids();
DROP FUNCTION IF EXISTS auth.admin_tenant_ids();
DROP FUNCTION IF EXISTS auth.manager_tenant_ids();
DROP FUNCTION IF EXISTS auth.user_tenant_ids();

CREATE OR REPLACE FUNCTION public.user_tenant_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM tenant_members
  WHERE user_id = auth.uid()
    AND status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.manager_tenant_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM tenant_members
  WHERE user_id = auth.uid()
    AND status = 'active'
    AND role IN ('admin', 'talent_manager');
$$;

CREATE OR REPLACE FUNCTION public.admin_tenant_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM tenant_members
  WHERE user_id = auth.uid()
    AND status = 'active'
    AND role = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.freelancer_tenant_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM tenant_members
  WHERE user_id = auth.uid()
    AND status = 'active'
    AND role = 'freelancer';
$$;

CREATE OR REPLACE FUNCTION public.user_freelancer_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM freelancers
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_role(p_tenant_id UUID, p_roles user_role[])
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
      AND role = ANY(p_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_manager_of(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_tenant_id IN (SELECT public.manager_tenant_ids());
$$;

CREATE OR REPLACE FUNCTION public.is_admin_of(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_tenant_id IN (SELECT public.admin_tenant_ids());
$$;

-- =============================================================================
-- 2. MEMBER INVITES (missing from initial schema)
-- =============================================================================
CREATE TABLE IF NOT EXISTS member_invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  role          user_role NOT NULL,
  invited_by    UUID NOT NULL REFERENCES profiles(id),
  token_hash    TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  accepted_at   TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_member_invites_tenant ON member_invites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_member_invites_token ON member_invites(token_hash) WHERE accepted_at IS NULL;

-- =============================================================================
-- 3. TENANT CONSISTENCY TRIGGERS (denormalized tenant_id columns)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.enforce_opportunity_recipient_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_opp_tenant UUID;
  v_freelancer_tenant UUID;
BEGIN
  SELECT tenant_id INTO v_opp_tenant FROM opportunities WHERE id = NEW.opportunity_id;
  SELECT tenant_id INTO v_freelancer_tenant FROM freelancers WHERE id = NEW.freelancer_id;

  IF v_opp_tenant IS NULL OR v_freelancer_tenant IS NULL THEN
    RAISE EXCEPTION 'Invalid opportunity or freelancer reference';
  END IF;

  IF v_opp_tenant <> v_freelancer_tenant THEN
    RAISE EXCEPTION 'Opportunity and freelancer must belong to the same tenant';
  END IF;

  NEW.tenant_id := v_opp_tenant;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_opp_recipient_tenant ON opportunity_recipients;
CREATE TRIGGER trg_opp_recipient_tenant
  BEFORE INSERT OR UPDATE ON opportunity_recipients
  FOR EACH ROW EXECUTE FUNCTION public.enforce_opportunity_recipient_tenant();

CREATE OR REPLACE FUNCTION public.enforce_child_tenant_from_parent()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_parent_tenant UUID;
BEGIN
  IF TG_TABLE_NAME = 'shortlist_items' THEN
    SELECT s.tenant_id INTO v_parent_tenant
    FROM shortlists s WHERE s.id = NEW.shortlist_id;
  ELSIF TG_TABLE_NAME = 'milestones' THEN
    SELECT p.tenant_id INTO v_parent_tenant
    FROM projects p WHERE p.id = NEW.project_id;
  ELSIF TG_TABLE_NAME = 'talent_match_scores' THEN
    SELECT o.tenant_id INTO v_parent_tenant
    FROM opportunities o WHERE o.id = NEW.opportunity_id;
  END IF;

  IF v_parent_tenant IS NULL THEN
    RAISE EXCEPTION 'Parent record not found for tenant enforcement';
  END IF;

  NEW.tenant_id := v_parent_tenant;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shortlist_item_tenant ON shortlist_items;
CREATE TRIGGER trg_shortlist_item_tenant
  BEFORE INSERT OR UPDATE ON shortlist_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_child_tenant_from_parent();

DROP TRIGGER IF EXISTS trg_milestone_tenant ON milestones;
CREATE TRIGGER trg_milestone_tenant
  BEFORE INSERT OR UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION public.enforce_child_tenant_from_parent();

DROP TRIGGER IF EXISTS trg_match_score_tenant ON talent_match_scores;
CREATE TRIGGER trg_match_score_tenant
  BEFORE INSERT OR UPDATE ON talent_match_scores
  FOR EACH ROW EXECUTE FUNCTION public.enforce_child_tenant_from_parent();

-- =============================================================================
-- 4. ADDITIONAL CHECK CONSTRAINTS
-- =============================================================================
ALTER TABLE tenants
  ADD CONSTRAINT chk_tenants_subscription_status
  CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'suspended'));

ALTER TABLE payments
  ADD CONSTRAINT chk_payments_amount_positive
  CHECK (amount > 0);

ALTER TABLE milestones
  ADD CONSTRAINT chk_milestones_amount_non_negative
  CHECK (amount >= 0);

ALTER TABLE member_invites
  ADD CONSTRAINT chk_member_invites_role
  CHECK (role IN ('admin', 'talent_manager', 'freelancer'));

-- =============================================================================
-- 5. DROP OLD RLS POLICIES (auth.* references) — recreate with public.*
-- =============================================================================

-- Tenants
DROP POLICY IF EXISTS "tenants_select" ON tenants;
DROP POLICY IF EXISTS "tenants_update" ON tenants;

-- Profiles
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;

-- Tenant members
DROP POLICY IF EXISTS "tenant_members_select" ON tenant_members;
DROP POLICY IF EXISTS "tenant_members_insert" ON tenant_members;
DROP POLICY IF EXISTS "tenant_members_update" ON tenant_members;
DROP POLICY IF EXISTS "tenant_members_delete" ON tenant_members;

-- Freelancers
DROP POLICY IF EXISTS "freelancers_select_manager" ON freelancers;
DROP POLICY IF EXISTS "freelancers_select_own" ON freelancers;
DROP POLICY IF EXISTS "freelancers_insert" ON freelancers;
DROP POLICY IF EXISTS "freelancers_update_manager" ON freelancers;
DROP POLICY IF EXISTS "freelancers_update_own" ON freelancers;
DROP POLICY IF EXISTS "freelancers_delete" ON freelancers;

-- Opportunities
DROP POLICY IF EXISTS "opportunities_select_manager" ON opportunities;
DROP POLICY IF EXISTS "opportunities_select_freelancer" ON opportunities;
DROP POLICY IF EXISTS "opportunities_insert" ON opportunities;
DROP POLICY IF EXISTS "opportunities_update" ON opportunities;
DROP POLICY IF EXISTS "opportunities_delete" ON opportunities;

-- Opportunity recipients
DROP POLICY IF EXISTS "opp_recipients_select_manager" ON opportunity_recipients;
DROP POLICY IF EXISTS "opp_recipients_select_freelancer" ON opportunity_recipients;
DROP POLICY IF EXISTS "opp_recipients_insert" ON opportunity_recipients;
DROP POLICY IF EXISTS "opp_recipients_update_manager" ON opportunity_recipients;
DROP POLICY IF EXISTS "opp_recipients_update_freelancer" ON opportunity_recipients;

-- Shortlists
DROP POLICY IF EXISTS "shortlists_select" ON shortlists;
DROP POLICY IF EXISTS "shortlists_insert" ON shortlists;
DROP POLICY IF EXISTS "shortlists_update" ON shortlists;

-- Shortlist items
DROP POLICY IF EXISTS "shortlist_items_select" ON shortlist_items;
DROP POLICY IF EXISTS "shortlist_items_insert" ON shortlist_items;
DROP POLICY IF EXISTS "shortlist_items_update" ON shortlist_items;
DROP POLICY IF EXISTS "shortlist_items_delete" ON shortlist_items;

-- Projects
DROP POLICY IF EXISTS "projects_select_manager" ON projects;
DROP POLICY IF EXISTS "projects_select_freelancer" ON projects;
DROP POLICY IF EXISTS "projects_insert" ON projects;
DROP POLICY IF EXISTS "projects_update_manager" ON projects;
DROP POLICY IF EXISTS "projects_update_freelancer" ON projects;

-- Milestones
DROP POLICY IF EXISTS "milestones_select_manager" ON milestones;
DROP POLICY IF EXISTS "milestones_select_freelancer" ON milestones;
DROP POLICY IF EXISTS "milestones_insert" ON milestones;
DROP POLICY IF EXISTS "milestones_update_manager" ON milestones;
DROP POLICY IF EXISTS "milestones_update_freelancer" ON milestones;

-- Payments
DROP POLICY IF EXISTS "payments_select_manager" ON payments;
DROP POLICY IF EXISTS "payments_select_freelancer" ON payments;
DROP POLICY IF EXISTS "payments_insert" ON payments;
DROP POLICY IF EXISTS "payments_update_admin" ON payments;
DROP POLICY IF EXISTS "payments_update_manager_approve" ON payments;

-- Activity logs
DROP POLICY IF EXISTS "activity_logs_select_manager" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_select_freelancer" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert" ON activity_logs;

-- Notifications
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert" ON notifications;

-- WhatsApp
DROP POLICY IF EXISTS "wa_messages_select_manager" ON whatsapp_messages;
DROP POLICY IF EXISTS "wa_messages_insert" ON whatsapp_messages;

-- Integration configs
DROP POLICY IF EXISTS "integration_configs_select" ON integration_configs;
DROP POLICY IF EXISTS "integration_configs_insert" ON integration_configs;
DROP POLICY IF EXISTS "integration_configs_update" ON integration_configs;
DROP POLICY IF EXISTS "integration_configs_delete" ON integration_configs;

-- Event infrastructure (005)
DROP POLICY IF EXISTS "domain_events_select" ON domain_events;
DROP POLICY IF EXISTS "email_logs_select" ON email_logs;
DROP POLICY IF EXISTS "ai_requests_select" ON ai_requests;
DROP POLICY IF EXISTS "match_scores_select" ON talent_match_scores;
DROP POLICY IF EXISTS "webhook_deliveries_select" ON webhook_deliveries;

-- =============================================================================
-- 6. COMPLETE RLS POLICIES
-- =============================================================================

-- ---------- TENANTS ----------
CREATE POLICY "tenants_select" ON tenants FOR SELECT TO authenticated
  USING (id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "tenants_update" ON tenants FOR UPDATE TO authenticated
  USING (id IN (SELECT public.admin_tenant_ids()))
  WITH CHECK (id IN (SELECT public.admin_tenant_ids()));

-- INSERT via create_tenant_with_admin() SECURITY DEFINER only

-- ---------- PROFILES ----------
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR id IN (
      SELECT tm.user_id FROM tenant_members tm
      WHERE tm.tenant_id IN (SELECT public.user_tenant_ids())
    )
  );

CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---------- TENANT MEMBERS ----------
CREATE POLICY "tenant_members_select" ON tenant_members FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "tenant_members_insert" ON tenant_members FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.admin_tenant_ids()));

CREATE POLICY "tenant_members_update" ON tenant_members FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.admin_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.admin_tenant_ids()));

CREATE POLICY "tenant_members_delete" ON tenant_members FOR DELETE TO authenticated
  USING (
    tenant_id IN (SELECT public.admin_tenant_ids())
    AND user_id <> auth.uid()  -- cannot remove self
  );

-- ---------- MEMBER INVITES ----------
ALTER TABLE member_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_invites_select" ON member_invites FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.admin_tenant_ids()));

CREATE POLICY "member_invites_insert" ON member_invites FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.admin_tenant_ids()));

CREATE POLICY "member_invites_update" ON member_invites FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.admin_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.admin_tenant_ids()));

CREATE POLICY "member_invites_delete" ON member_invites FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT public.admin_tenant_ids()));

-- ---------- FREELANCERS ----------
CREATE POLICY "freelancers_select_manager" ON freelancers FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "freelancers_select_own" ON freelancers FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "freelancers_insert" ON freelancers FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "freelancers_update_manager" ON freelancers FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "freelancers_update_own" ON freelancers FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "freelancers_delete" ON freelancers FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

-- ---------- OPPORTUNITIES ----------
CREATE POLICY "opportunities_select_manager" ON opportunities FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "opportunities_select_freelancer" ON opportunities FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT opportunity_id FROM opportunity_recipients
      WHERE freelancer_id IN (SELECT public.user_freelancer_ids())
    )
  );

CREATE POLICY "opportunities_insert" ON opportunities FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT public.manager_tenant_ids())
    AND created_by = auth.uid()
  );

CREATE POLICY "opportunities_update" ON opportunities FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "opportunities_delete" ON opportunities FOR DELETE TO authenticated
  USING (
    tenant_id IN (SELECT public.manager_tenant_ids())
    AND status = 'draft'
  );

-- ---------- OPPORTUNITY RECIPIENTS ----------
CREATE POLICY "opp_recipients_select_manager" ON opportunity_recipients FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "opp_recipients_select_freelancer" ON opportunity_recipients FOR SELECT TO authenticated
  USING (freelancer_id IN (SELECT public.user_freelancer_ids()));

CREATE POLICY "opp_recipients_insert" ON opportunity_recipients FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "opp_recipients_update_manager" ON opportunity_recipients FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "opp_recipients_update_freelancer" ON opportunity_recipients FOR UPDATE TO authenticated
  USING (freelancer_id IN (SELECT public.user_freelancer_ids()))
  WITH CHECK (freelancer_id IN (SELECT public.user_freelancer_ids()));

CREATE POLICY "opp_recipients_delete" ON opportunity_recipients FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

-- ---------- SHORTLISTS ----------
CREATE POLICY "shortlists_select" ON shortlists FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "shortlists_insert" ON shortlists FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT public.manager_tenant_ids())
    AND created_by = auth.uid()
  );

CREATE POLICY "shortlists_update" ON shortlists FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "shortlists_delete" ON shortlists FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

-- ---------- SHORTLIST ITEMS ----------
CREATE POLICY "shortlist_items_select" ON shortlist_items FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "shortlist_items_insert" ON shortlist_items FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "shortlist_items_update" ON shortlist_items FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "shortlist_items_delete" ON shortlist_items FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

-- ---------- PROJECTS ----------
CREATE POLICY "projects_select_manager" ON projects FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "projects_select_freelancer" ON projects FOR SELECT TO authenticated
  USING (freelancer_id IN (SELECT public.user_freelancer_ids()));

CREATE POLICY "projects_insert" ON projects FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT public.manager_tenant_ids())
    AND assigned_by = auth.uid()
  );

CREATE POLICY "projects_update_manager" ON projects FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "projects_update_freelancer" ON projects FOR UPDATE TO authenticated
  USING (freelancer_id IN (SELECT public.user_freelancer_ids()))
  WITH CHECK (freelancer_id IN (SELECT public.user_freelancer_ids()));

CREATE POLICY "projects_delete" ON projects FOR DELETE TO authenticated
  USING (
    tenant_id IN (SELECT public.manager_tenant_ids())
    AND status IN ('draft', 'canceled')
  );

-- ---------- MILESTONES ----------
CREATE POLICY "milestones_select_manager" ON milestones FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "milestones_select_freelancer" ON milestones FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE freelancer_id IN (SELECT public.user_freelancer_ids())
    )
  );

CREATE POLICY "milestones_insert" ON milestones FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "milestones_update_manager" ON milestones FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "milestones_update_freelancer" ON milestones FOR UPDATE TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE freelancer_id IN (SELECT public.user_freelancer_ids())
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects
      WHERE freelancer_id IN (SELECT public.user_freelancer_ids())
    )
  );

CREATE POLICY "milestones_delete" ON milestones FOR DELETE TO authenticated
  USING (
    tenant_id IN (SELECT public.manager_tenant_ids())
    AND status IN ('pending', 'canceled')
  );

-- ---------- PAYMENTS ----------
CREATE POLICY "payments_select_manager" ON payments FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "payments_select_freelancer" ON payments FOR SELECT TO authenticated
  USING (freelancer_id IN (SELECT public.user_freelancer_ids()));

CREATE POLICY "payments_insert" ON payments FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "payments_update_admin" ON payments FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.admin_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.admin_tenant_ids()));

CREATE POLICY "payments_dispute_freelancer" ON payments FOR UPDATE TO authenticated
  USING (
    freelancer_id IN (SELECT public.user_freelancer_ids())
    AND status IN ('pending', 'approved')
  )
  WITH CHECK (
    freelancer_id IN (SELECT public.user_freelancer_ids())
    AND status = 'disputed'
  );

-- ---------- ACTIVITY LOGS (immutable) ----------
CREATE POLICY "activity_logs_select_manager" ON activity_logs FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "activity_logs_select_freelancer" ON activity_logs FOR SELECT TO authenticated
  USING (
    entity_type IN ('project', 'milestone', 'payment')
    AND entity_id IN (
      SELECT p.id FROM projects p
      WHERE p.freelancer_id IN (SELECT public.user_freelancer_ids())
      UNION
      SELECT m.id FROM milestones m
      JOIN projects p ON p.id = m.project_id
      WHERE p.freelancer_id IN (SELECT public.user_freelancer_ids())
      UNION
      SELECT pay.id FROM payments pay
      WHERE pay.freelancer_id IN (SELECT public.user_freelancer_ids())
    )
  );

CREATE POLICY "activity_logs_insert" ON activity_logs FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));

-- ---------- NOTIFICATIONS ----------
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------- WHATSAPP MESSAGES ----------
CREATE POLICY "wa_messages_select_manager" ON whatsapp_messages FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "wa_messages_insert" ON whatsapp_messages FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

-- ---------- EMAIL LOGS ----------
CREATE POLICY "email_logs_select_manager" ON email_logs FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "email_logs_select_own" ON email_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ---------- INTEGRATION CONFIGS ----------
CREATE POLICY "integration_configs_select" ON integration_configs FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.admin_tenant_ids()));

CREATE POLICY "integration_configs_insert" ON integration_configs FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.admin_tenant_ids()));

CREATE POLICY "integration_configs_update" ON integration_configs FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.admin_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.admin_tenant_ids()));

CREATE POLICY "integration_configs_delete" ON integration_configs FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT public.admin_tenant_ids()));

-- ---------- DOMAIN EVENTS ----------
CREATE POLICY "domain_events_select_admin" ON domain_events FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.admin_tenant_ids()));

CREATE POLICY "domain_events_select_manager" ON domain_events FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT public.manager_tenant_ids())
    AND event_type NOT LIKE '%integration%'
  );

-- ---------- WEBHOOK DELIVERIES ----------
CREATE POLICY "webhook_deliveries_select" ON webhook_deliveries FOR SELECT TO authenticated
  USING (
    tenant_id IS NULL
    OR tenant_id IN (SELECT public.admin_tenant_ids())
  );

-- ---------- AI REQUESTS ----------
CREATE POLICY "ai_requests_select" ON ai_requests FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

-- ---------- TALENT MATCH SCORES ----------
CREATE POLICY "match_scores_select_manager" ON talent_match_scores FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "match_scores_select_freelancer" ON talent_match_scores FOR SELECT TO authenticated
  USING (freelancer_id IN (SELECT public.user_freelancer_ids()));

-- =============================================================================
-- 7. STORAGE RLS — complete CRUD
-- =============================================================================
DROP POLICY IF EXISTS "tenant_logos_read" ON storage.objects;
DROP POLICY IF EXISTS "tenant_logos_write" ON storage.objects;
DROP POLICY IF EXISTS "deliverables_read" ON storage.objects;
DROP POLICY IF EXISTS "deliverables_write" ON storage.objects;
DROP POLICY IF EXISTS "avatars_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_write" ON storage.objects;

CREATE POLICY "tenant_logos_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tenant-logos');

CREATE POLICY "tenant_logos_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-logos'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.admin_tenant_ids())
  );

CREATE POLICY "tenant_logos_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'tenant-logos'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.admin_tenant_ids())
  );

CREATE POLICY "tenant_logos_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'tenant-logos'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.admin_tenant_ids())
  );

CREATE POLICY "deliverables_select" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'deliverables'
    AND (
      (storage.foldername(name))[1]::uuid IN (SELECT public.manager_tenant_ids())
      OR EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id::text = (storage.foldername(name))[2]
          AND p.freelancer_id IN (SELECT public.user_freelancer_ids())
      )
    )
  );

CREATE POLICY "deliverables_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'deliverables'
    AND (
      (storage.foldername(name))[1]::uuid IN (SELECT public.manager_tenant_ids())
      OR EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id::text = (storage.foldername(name))[2]
          AND p.freelancer_id IN (SELECT public.user_freelancer_ids())
      )
    )
  );

CREATE POLICY "deliverables_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'deliverables'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.manager_tenant_ids())
  );

CREATE POLICY "avatars_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================================================
-- 8. TABLE & COLUMN COMMENTS
-- =============================================================================
COMMENT ON TABLE tenants IS 'Agency workspaces — root of multi-tenant isolation';
COMMENT ON TABLE tenant_members IS 'User-to-tenant membership with role assignment';
COMMENT ON TABLE freelancers IS 'Talent profiles within a tenant; may link to auth user';
COMMENT ON TABLE opportunities IS 'Open gigs broadcast to freelancers';
COMMENT ON TABLE opportunity_recipients IS 'Broadcast tracking and freelancer responses';
COMMENT ON TABLE shortlists IS 'Curated candidate list per opportunity';
COMMENT ON TABLE projects IS 'Assigned engagements with milestones';
COMMENT ON TABLE milestones IS 'Deliverable checkpoints; approval triggers payment';
COMMENT ON TABLE payments IS 'Payment records linked 1:1 to approved milestones';
COMMENT ON TABLE domain_events IS 'Transactional outbox for event-driven n8n dispatch';
COMMENT ON TABLE webhook_deliveries IS 'Inbound webhook idempotency and audit log';
COMMENT ON TABLE ai_requests IS 'AI governance: OpenAI/Claude request audit and cost tracking';
COMMENT ON TABLE talent_match_scores IS 'AI-generated talent-opportunity match rankings';
COMMENT ON TABLE member_invites IS 'Pending team/freelancer invitations';

-- =============================================================================
-- 9. GRANTS
-- =============================================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_tenant_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_tenant_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_tenant_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.freelancer_tenant_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_freelancer_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tenant_role(UUID, user_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_freelancers(UUID, TEXT, discipline_type, availability_status, NUMERIC, NUMERIC, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.suggest_talent_for_opportunity(UUID) TO authenticated;

-- Security definer functions — authenticated only, not anon
REVOKE ALL ON FUNCTION public.create_tenant_with_admin(TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.link_freelancer_to_user(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.emit_domain_event(UUID, TEXT, TEXT, UUID, TEXT, JSONB, UUID, UUID, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_tenant_with_admin(TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_freelancer_to_user(UUID, UUID) TO authenticated;

-- =============================================================================
-- 10. REALTIME
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE domain_events;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE talent_match_scores;
