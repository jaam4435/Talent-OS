-- Project workflow fixes: invite revoke, payments RLS, client read access, view security, company-aware RPC

-- =============================================================================
-- 1. FIX revoke_member_invite (is_tenant_admin was never defined)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.revoke_member_invite(
  p_invite_id UUID,
  p_actor_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_actor_id THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT mi.tenant_id INTO v_tenant_id
  FROM member_invites mi
  WHERE mi.id = p_invite_id
    AND mi.accepted_at IS NULL
    AND mi.revoked_at IS NULL;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'INVITE_NOT_FOUND';
  END IF;

  IF NOT public.is_admin_of(v_tenant_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE member_invites
  SET revoked_at = now()
  WHERE id = p_invite_id;
END;
$$;

-- =============================================================================
-- 2. RESTORE manager payment approval (dropped in 006)
-- =============================================================================
DROP POLICY IF EXISTS "payments_update_manager_approve" ON payments;
CREATE POLICY "payments_update_manager_approve" ON payments FOR UPDATE TO authenticated
  USING (
    tenant_id IN (SELECT public.manager_tenant_ids())
    AND status = 'pending'
  )
  WITH CHECK (
    tenant_id IN (SELECT public.manager_tenant_ids())
    AND status IN ('approved', 'pending')
  );

-- =============================================================================
-- 3. CLIENT READ ACCESS — milestones & payments on company projects
-- =============================================================================
DROP POLICY IF EXISTS "milestones_select_client" ON milestones;
CREATE POLICY "milestones_select_client" ON milestones FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE company_id IN (SELECT public.client_company_ids())
    )
  );

DROP POLICY IF EXISTS "payments_select_client" ON payments;
CREATE POLICY "payments_select_client" ON payments FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE company_id IN (SELECT public.client_company_ids())
    )
  );

-- =============================================================================
-- 4. VIEW SECURITY — respect underlying table RLS
-- =============================================================================
ALTER VIEW public.users SET (security_invoker = true);
ALTER VIEW public.talent_profiles SET (security_invoker = true);

-- =============================================================================
-- 5. OPPORTUNITY company name sync (parity with projects)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.sync_opportunity_company_name()
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

DROP TRIGGER IF EXISTS trg_opportunity_company_name ON opportunities;
CREATE TRIGGER trg_opportunity_company_name
  BEFORE INSERT OR UPDATE OF company_id ON opportunities
  FOR EACH ROW EXECUTE FUNCTION public.sync_opportunity_company_name();

-- =============================================================================
-- 6. CLIENT INVITES — company_id on member_invites
-- =============================================================================
ALTER TABLE member_invites
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_member_invites_company
  ON member_invites(company_id) WHERE company_id IS NOT NULL;

-- =============================================================================
-- 7. ACCEPT INVITE — link freelancer roster + client company
-- =============================================================================
CREATE OR REPLACE FUNCTION public.accept_member_invite(
  p_token_hash TEXT,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite member_invites%ROWTYPE;
  v_email TEXT;
  v_freelancer_id UUID;
BEGIN
  SELECT email INTO v_email FROM profiles WHERE id = p_user_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;

  SELECT * INTO v_invite
  FROM member_invites
  WHERE token_hash = p_token_hash
    AND accepted_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVITE_INVALID';
  END IF;

  IF lower(v_invite.email) <> lower(v_email) THEN
    RAISE EXCEPTION 'INVITE_EMAIL_MISMATCH';
  END IF;

  INSERT INTO tenant_members (tenant_id, user_id, role, status, company_id, invited_at, joined_at)
  VALUES (
    v_invite.tenant_id,
    p_user_id,
    v_invite.role,
    'active',
    CASE WHEN v_invite.role = 'client' THEN v_invite.company_id ELSE NULL END,
    v_invite.created_at,
    now()
  )
  ON CONFLICT (tenant_id, user_id) DO UPDATE
    SET
      role = EXCLUDED.role,
      status = 'active',
      company_id = COALESCE(EXCLUDED.company_id, tenant_members.company_id),
      joined_at = COALESCE(tenant_members.joined_at, now());

  IF v_invite.role = 'freelancer' THEN
    SELECT id INTO v_freelancer_id
    FROM freelancers
    WHERE tenant_id = v_invite.tenant_id
      AND lower(email) = lower(v_invite.email)
      AND user_id IS NULL
    ORDER BY created_at
    LIMIT 1;

    IF v_freelancer_id IS NOT NULL THEN
      PERFORM public.link_freelancer_to_user(v_freelancer_id, p_user_id);
    END IF;
  END IF;

  UPDATE member_invites
  SET accepted_at = now()
  WHERE id = v_invite.id;

  RETURN v_invite.tenant_id;
END;
$$;

-- =============================================================================
-- 8. PROJECT RPC — accept company_id atomically
-- =============================================================================
CREATE OR REPLACE FUNCTION public.create_project_with_milestones(
  p_tenant_id UUID,
  p_assigned_by UUID,
  p_freelancer_id UUID,
  p_title TEXT,
  p_milestones JSONB,
  p_opportunity_id UUID DEFAULT NULL,
  p_shortlist_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_client_name TEXT DEFAULT NULL,
  p_budget NUMERIC DEFAULT NULL,
  p_currency CHAR(3) DEFAULT 'USD',
  p_status project_status DEFAULT 'active',
  p_company_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_milestone JSONB;
  v_total NUMERIC := 0;
  v_sort INTEGER := 0;
  v_company_name TEXT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_assigned_by THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF NOT public.is_manager_of(p_tenant_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_milestones IS NULL OR jsonb_array_length(p_milestones) < 1 THEN
    RAISE EXCEPTION 'MILESTONES_REQUIRED';
  END IF;

  FOR v_milestone IN SELECT value FROM jsonb_array_elements(p_milestones)
  LOOP
    IF COALESCE((v_milestone->>'amount')::NUMERIC, 0) < 0 THEN
      RAISE EXCEPTION 'INVALID_MILESTONE_AMOUNT';
    END IF;
    v_total := v_total + COALESCE((v_milestone->>'amount')::NUMERIC, 0);
  END LOOP;

  IF p_budget IS NOT NULL AND v_total > p_budget THEN
    RAISE EXCEPTION 'MILESTONE_BUDGET_EXCEEDED';
  END IF;

  IF p_opportunity_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM opportunities
      WHERE id = p_opportunity_id AND tenant_id = p_tenant_id
    ) THEN
      RAISE EXCEPTION 'OPPORTUNITY_NOT_FOUND';
    END IF;
  END IF;

  IF p_company_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM companies
      WHERE id = p_company_id AND tenant_id = p_tenant_id
    ) THEN
      RAISE EXCEPTION 'COMPANY_NOT_FOUND';
    END IF;
    SELECT name INTO v_company_name FROM companies WHERE id = p_company_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM freelancers
    WHERE id = p_freelancer_id AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'FREELANCER_NOT_FOUND';
  END IF;

  INSERT INTO projects (
    tenant_id,
    opportunity_id,
    shortlist_id,
    freelancer_id,
    assigned_by,
    title,
    description,
    client_name,
    company_id,
    budget,
    currency,
    status,
    started_at
  )
  VALUES (
    p_tenant_id,
    p_opportunity_id,
    p_shortlist_id,
    p_freelancer_id,
    p_assigned_by,
    p_title,
    p_description,
    COALESCE(v_company_name, p_client_name),
    p_company_id,
    p_budget,
    p_currency,
    p_status,
    CASE WHEN p_status = 'active' THEN now() ELSE NULL END
  )
  RETURNING id INTO v_project_id;

  FOR v_milestone IN SELECT value FROM jsonb_array_elements(p_milestones)
  LOOP
    v_sort := v_sort + 1;
    INSERT INTO milestones (
      project_id,
      tenant_id,
      title,
      description,
      amount,
      due_date,
      sort_order,
      status
    )
    VALUES (
      v_project_id,
      p_tenant_id,
      v_milestone->>'title',
      NULLIF(v_milestone->>'description', ''),
      COALESCE((v_milestone->>'amount')::NUMERIC, 0),
      NULLIF(v_milestone->>'due_date', '')::DATE,
      COALESCE((v_milestone->>'sort_order')::INTEGER, v_sort),
      COALESCE((v_milestone->>'status')::milestone_status, 'pending')
    );
  END LOOP;

  RETURN v_project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_project_with_milestones(
  UUID, UUID, UUID, TEXT, JSONB, UUID, UUID, TEXT, TEXT, NUMERIC, CHAR(3), project_status, UUID
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_project_with_milestones(
  UUID, UUID, UUID, TEXT, JSONB, UUID, UUID, TEXT, TEXT, NUMERIC, CHAR(3), project_status, UUID
) TO authenticated;
