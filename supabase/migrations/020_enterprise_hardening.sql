-- Talent OS — Enterprise hardening (security, performance, RLS)
-- Depends on: 001–019

-- =============================================================================
-- 1. DOMAIN EVENT RPC — allow authenticated tenant-scoped emits
-- =============================================================================
GRANT EXECUTE ON FUNCTION public.emit_domain_event(
  UUID, TEXT, TEXT, UUID, TEXT, JSONB, UUID, UUID, TIMESTAMPTZ
) TO authenticated;

-- =============================================================================
-- 2. REVOKE direct cross-tenant view access
-- =============================================================================
REVOKE SELECT ON v_dashboard_summary FROM authenticated;
REVOKE SELECT ON v_opportunity_fill_rate FROM authenticated;
REVOKE SELECT ON v_freelancer_utilization FROM authenticated;
REVOKE SELECT ON v_payment_aging FROM authenticated;
REVOKE SELECT ON v_response_metrics FROM authenticated;
REVOKE SELECT ON v_ai_usage FROM authenticated;
REVOKE SELECT ON v_event_pipeline_health FROM authenticated;
REVOKE SELECT ON v_observability_workflow_health FROM authenticated;
REVOKE SELECT ON v_observability_queue_depth FROM authenticated;
REVOKE SELECT ON v_observability_notification_delivery FROM authenticated;
REVOKE SELECT ON v_observability_ai_latency FROM authenticated;
REVOKE SELECT ON v_observability_failures_24h FROM authenticated;

-- =============================================================================
-- 3. TENANT-SCOPED SECURE RPCs (analytics)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_tenant_id UUID)
RETURNS SETOF v_dashboard_summary
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT *
  FROM v_dashboard_summary
  WHERE tenant_id = p_tenant_id
    AND p_tenant_id = ANY(SELECT public.user_tenant_ids());
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(UUID) TO authenticated;

-- =============================================================================
-- 4. MANAGER-SCOPED SECURE RPCs (observability)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_observability_workflow_health(p_tenant_id UUID)
RETURNS SETOF v_observability_workflow_health
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT *
  FROM v_observability_workflow_health
  WHERE tenant_id = p_tenant_id
    AND public.is_manager_of(p_tenant_id);
$$;

CREATE OR REPLACE FUNCTION public.get_observability_queue_depth(p_tenant_id UUID)
RETURNS SETOF v_observability_queue_depth
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT *
  FROM v_observability_queue_depth
  WHERE tenant_id = p_tenant_id
    AND public.is_manager_of(p_tenant_id);
$$;

CREATE OR REPLACE FUNCTION public.get_observability_notification_delivery(p_tenant_id UUID)
RETURNS SETOF v_observability_notification_delivery
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT *
  FROM v_observability_notification_delivery
  WHERE tenant_id = p_tenant_id
    AND public.is_manager_of(p_tenant_id);
$$;

CREATE OR REPLACE FUNCTION public.get_observability_ai_latency(p_tenant_id UUID)
RETURNS SETOF v_observability_ai_latency
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT *
  FROM v_observability_ai_latency
  WHERE tenant_id = p_tenant_id
    AND public.is_manager_of(p_tenant_id);
$$;

CREATE OR REPLACE FUNCTION public.get_observability_failures_24h(p_tenant_id UUID)
RETURNS SETOF v_observability_failures_24h
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT *
  FROM v_observability_failures_24h
  WHERE tenant_id = p_tenant_id
    AND public.is_manager_of(p_tenant_id);
$$;

CREATE OR REPLACE FUNCTION public.get_event_pipeline_health(p_tenant_id UUID)
RETURNS SETOF v_event_pipeline_health
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT *
  FROM v_event_pipeline_health
  WHERE tenant_id = p_tenant_id
    AND public.is_manager_of(p_tenant_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_observability_workflow_health(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_observability_queue_depth(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_observability_notification_delivery(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_observability_ai_latency(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_observability_failures_24h(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_pipeline_health(UUID) TO authenticated;

-- =============================================================================
-- 5. PERFORMANCE — freelancer phone lookup index
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_freelancers_tenant_phone ON freelancers(tenant_id, phone);

-- =============================================================================
-- 6. RLS — shortlists DELETE for managers
-- =============================================================================
CREATE POLICY "shortlists_delete" ON shortlists FOR DELETE TO authenticated
  USING (tenant_id = ANY(SELECT public.manager_tenant_ids()));
