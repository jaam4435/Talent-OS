-- Sprint 2: Atomic project creation with milestones

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
  p_status project_status DEFAULT 'active'
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
    p_client_name,
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
  UUID, UUID, UUID, TEXT, JSONB, UUID, UUID, TEXT, TEXT, NUMERIC, CHAR(3), project_status
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_project_with_milestones(
  UUID, UUID, UUID, TEXT, JSONB, UUID, UUID, TEXT, TEXT, NUMERIC, CHAR(3), project_status
) TO authenticated;
