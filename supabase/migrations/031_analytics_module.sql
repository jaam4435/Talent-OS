-- Talent OS — Analytics Module
-- Depends on: 004 (views), 023 (organization), 026 (projects), 027 (assignments), 028 (workflows), 029 (ai_requests)

-- =============================================================================
-- EXPORT TRACKING
-- =============================================================================
CREATE TABLE analytics_exports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  requested_by    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dashboard       TEXT NOT NULL,
  format          TEXT NOT NULL DEFAULT 'csv' CHECK (format IN ('csv', 'json')),
  status          TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  row_count       INT NOT NULL DEFAULT 0,
  content         TEXT,
  filters         JSONB NOT NULL DEFAULT '{}',
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX idx_analytics_exports_tenant ON analytics_exports(tenant_id, created_at DESC);

-- =============================================================================
-- CACHE METADATA (optional persistence; in-process cache also used)
-- =============================================================================
CREATE TABLE analytics_cache_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cache_key       TEXT NOT NULL,
  dashboard       TEXT NOT NULL,
  payload         JSONB NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, cache_key)
);

CREATE INDEX idx_analytics_cache_expires ON analytics_cache_snapshots(expires_at);

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE analytics_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_exports_select_manager" ON analytics_exports FOR SELECT TO authenticated
  USING (is_manager_of(tenant_id));

CREATE POLICY "analytics_exports_insert_manager" ON analytics_exports FOR INSERT TO authenticated
  WITH CHECK (is_manager_of(tenant_id) AND requested_by = auth.uid());

CREATE POLICY "analytics_cache_select_manager" ON analytics_cache_snapshots FOR SELECT TO authenticated
  USING (is_manager_of(tenant_id));

-- =============================================================================
-- HELPER: date range default
-- =============================================================================
CREATE OR REPLACE FUNCTION analytics_date_range(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS TABLE (range_from TIMESTAMPTZ, range_to TIMESTAMPTZ)
LANGUAGE sql IMMUTABLE AS $$
  SELECT
    COALESCE(p_from, date_trunc('day', now()) - interval '30 days'),
    COALESCE(p_to, now());
$$;

-- =============================================================================
-- ORGANIZATIONS DASHBOARD
-- =============================================================================
CREATE OR REPLACE FUNCTION get_analytics_organizations(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'total_members', (SELECT COUNT(*) FROM tenant_members tm WHERE tm.tenant_id = p_tenant_id AND tm.deleted_at IS NULL),
      'active_members', (SELECT COUNT(*) FROM tenant_members tm WHERE tm.tenant_id = p_tenant_id AND tm.status = 'active' AND tm.deleted_at IS NULL),
      'pending_invites', (SELECT COUNT(*) FROM member_invites mi WHERE mi.tenant_id = p_tenant_id AND mi.accepted_at IS NULL AND mi.revoked_at IS NULL),
      'departments', (SELECT COUNT(*) FROM org_departments d WHERE d.tenant_id = p_tenant_id AND d.deleted_at IS NULL),
      'teams', (SELECT COUNT(*) FROM org_teams t WHERE t.tenant_id = p_tenant_id AND t.deleted_at IS NULL),
      'team_members', (SELECT COUNT(*) FROM org_team_members otm WHERE otm.tenant_id = p_tenant_id)
    ),
    'charts', jsonb_build_object(
      'members_by_role', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('label', role, 'value', cnt) ORDER BY cnt DESC)
        FROM (
          SELECT tm.role, COUNT(*) AS cnt
          FROM tenant_members tm
          WHERE tm.tenant_id = p_tenant_id AND tm.deleted_at IS NULL
          GROUP BY tm.role
        ) r
      ), '[]'::jsonb),
      'invites_over_time', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('x', month, 'y', cnt) ORDER BY month)
        FROM (
          SELECT date_trunc('month', mi.created_at)::date AS month, COUNT(*) AS cnt
          FROM member_invites mi
          WHERE mi.tenant_id = p_tenant_id
          GROUP BY 1
        ) s
      ), '[]'::jsonb)
    )
  )
  WHERE is_manager_of(p_tenant_id);
$$;

-- =============================================================================
-- PROJECTS DASHBOARD
-- =============================================================================
CREATE OR REPLACE FUNCTION get_analytics_projects(
  p_tenant_id UUID,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH dr AS (SELECT * FROM analytics_date_range(p_from, p_to))
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM projects p WHERE p.tenant_id = p_tenant_id AND p.deleted_at IS NULL),
      'active', (SELECT COUNT(*) FROM projects p WHERE p.tenant_id = p_tenant_id AND p.status IN ('active', 'in_review') AND p.deleted_at IS NULL),
      'completed', (SELECT COUNT(*) FROM projects p WHERE p.tenant_id = p_tenant_id AND p.status = 'completed' AND p.deleted_at IS NULL),
      'at_risk', (SELECT COUNT(*) FROM projects p WHERE p.tenant_id = p_tenant_id AND p.health_status = 'at_risk' AND p.deleted_at IS NULL)
    ),
    'charts', jsonb_build_object(
      'by_status', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('label', status, 'value', cnt))
        FROM (SELECT p.status, COUNT(*) AS cnt FROM projects p WHERE p.tenant_id = p_tenant_id AND p.deleted_at IS NULL GROUP BY p.status) s
      ), '[]'::jsonb),
      'by_health', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('label', health_status, 'value', cnt))
        FROM (SELECT p.health_status, COUNT(*) AS cnt FROM projects p WHERE p.tenant_id = p_tenant_id AND p.deleted_at IS NULL GROUP BY p.health_status) h
      ), '[]'::jsonb),
      'created_over_time', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('x', month, 'y', cnt) ORDER BY month)
        FROM (
          SELECT date_trunc('month', p.created_at)::date AS month, COUNT(*) AS cnt
          FROM projects p, dr
          WHERE p.tenant_id = p_tenant_id AND p.deleted_at IS NULL
            AND p.created_at BETWEEN dr.range_from AND dr.range_to
          GROUP BY 1
        ) t
      ), '[]'::jsonb)
    )
  )
  WHERE is_manager_of(p_tenant_id);
$$;

-- =============================================================================
-- TALENT DASHBOARD
-- =============================================================================
CREATE OR REPLACE FUNCTION get_analytics_talent(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'total_freelancers', (SELECT COUNT(*) FROM freelancers f WHERE f.tenant_id = p_tenant_id),
      'available', (SELECT COUNT(*) FROM freelancers f WHERE f.tenant_id = p_tenant_id AND f.availability = 'available'),
      'avg_rating', (SELECT ROUND(AVG(f.internal_rating)::numeric, 2) FROM freelancers f WHERE f.tenant_id = p_tenant_id AND f.internal_rating IS NOT NULL),
      'with_active_projects', (SELECT COUNT(DISTINCT p.freelancer_id) FROM projects p WHERE p.tenant_id = p_tenant_id AND p.status IN ('active', 'in_review') AND p.deleted_at IS NULL)
    ),
    'charts', jsonb_build_object(
      'by_discipline', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('label', COALESCE(discipline, 'other'), 'value', cnt) ORDER BY cnt DESC)
        FROM (SELECT f.discipline, COUNT(*) AS cnt FROM freelancers f WHERE f.tenant_id = p_tenant_id GROUP BY f.discipline) d
      ), '[]'::jsonb),
      'by_availability', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('label', availability, 'value', cnt))
        FROM (SELECT f.availability, COUNT(*) AS cnt FROM freelancers f WHERE f.tenant_id = p_tenant_id GROUP BY f.availability) a
      ), '[]'::jsonb),
      'rating_distribution', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('label', bucket, 'value', cnt) ORDER BY bucket)
        FROM (
          SELECT CASE
            WHEN f.internal_rating >= 4.5 THEN '4.5+'
            WHEN f.internal_rating >= 4.0 THEN '4.0-4.4'
            WHEN f.internal_rating >= 3.0 THEN '3.0-3.9'
            ELSE 'below_3'
          END AS bucket, COUNT(*) AS cnt
          FROM freelancers f WHERE f.tenant_id = p_tenant_id AND f.internal_rating IS NOT NULL
          GROUP BY 1
        ) r
      ), '[]'::jsonb)
    )
  )
  WHERE is_manager_of(p_tenant_id);
$$;

-- =============================================================================
-- UTILIZATION DASHBOARD
-- =============================================================================
CREATE OR REPLACE FUNCTION get_analytics_utilization(
  p_tenant_id UUID,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH dr AS (SELECT * FROM analytics_date_range(p_from, p_to))
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'active_allocations', (SELECT COUNT(*) FROM assignment_allocations a WHERE a.tenant_id = p_tenant_id AND a.status IN ('confirmed', 'active') AND a.deleted_at IS NULL),
      'avg_allocation_pct', (SELECT ROUND(AVG(a.allocation_pct)::numeric, 1) FROM assignment_allocations a WHERE a.tenant_id = p_tenant_id AND a.status IN ('confirmed', 'active') AND a.deleted_at IS NULL),
      'freelancers_allocated', (SELECT COUNT(DISTINCT a.freelancer_id) FROM assignment_allocations a WHERE a.tenant_id = p_tenant_id AND a.status IN ('confirmed', 'active') AND a.deleted_at IS NULL),
      'open_conflicts', (SELECT COUNT(*) FROM assignment_conflicts c WHERE c.tenant_id = p_tenant_id AND c.resolved_at IS NULL)
    ),
    'charts', jsonb_build_object(
      'allocation_by_status', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('label', status, 'value', cnt))
        FROM (SELECT a.status, COUNT(*) AS cnt FROM assignment_allocations a WHERE a.tenant_id = p_tenant_id AND a.deleted_at IS NULL GROUP BY a.status) s
      ), '[]'::jsonb),
      'utilization_over_time', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('x', month, 'y', avg_pct) ORDER BY month)
        FROM (
          SELECT date_trunc('month', a.starts_at)::date AS month, ROUND(AVG(a.allocation_pct)::numeric, 1) AS avg_pct
          FROM assignment_allocations a, dr
          WHERE a.tenant_id = p_tenant_id AND a.deleted_at IS NULL
            AND a.starts_at BETWEEN dr.range_from AND dr.range_to
          GROUP BY 1
        ) t
      ), '[]'::jsonb),
      'top_utilized', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('label', full_name, 'value', allocation_pct) ORDER BY allocation_pct DESC)
        FROM (
          SELECT f.full_name, SUM(a.allocation_pct)::int AS allocation_pct
          FROM assignment_allocations a
          JOIN freelancers f ON f.id = a.freelancer_id
          WHERE a.tenant_id = p_tenant_id AND a.status IN ('confirmed', 'active') AND a.deleted_at IS NULL
          GROUP BY f.full_name
          ORDER BY allocation_pct DESC
          LIMIT 10
        ) top
      ), '[]'::jsonb)
    )
  )
  WHERE is_manager_of(p_tenant_id);
$$;

-- =============================================================================
-- REVENUE DASHBOARD
-- =============================================================================
CREATE OR REPLACE FUNCTION get_analytics_revenue(
  p_tenant_id UUID,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH dr AS (SELECT * FROM analytics_date_range(p_from, p_to))
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'paid_total', (SELECT COALESCE(SUM(pay.amount), 0) FROM payments pay, dr WHERE pay.tenant_id = p_tenant_id AND pay.status = 'paid' AND pay.paid_at BETWEEN dr.range_from AND dr.range_to),
      'pending_total', (SELECT COALESCE(SUM(pay.amount), 0) FROM payments pay WHERE pay.tenant_id = p_tenant_id AND pay.status = 'pending'),
      'approved_total', (SELECT COALESCE(SUM(pay.amount), 0) FROM payments pay WHERE pay.tenant_id = p_tenant_id AND pay.status = 'approved'),
      'payment_count', (SELECT COUNT(*) FROM payments pay, dr WHERE pay.tenant_id = p_tenant_id AND pay.created_at BETWEEN dr.range_from AND dr.range_to)
    ),
    'charts', jsonb_build_object(
      'revenue_over_time', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('x', month, 'y', total) ORDER BY month)
        FROM (
          SELECT date_trunc('month', pay.paid_at)::date AS month, COALESCE(SUM(pay.amount), 0) AS total
          FROM payments pay, dr
          WHERE pay.tenant_id = p_tenant_id AND pay.status = 'paid' AND pay.paid_at BETWEEN dr.range_from AND dr.range_to
          GROUP BY 1
        ) t
      ), '[]'::jsonb),
      'by_status', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('label', status, 'value', total))
        FROM (SELECT pay.status, COALESCE(SUM(pay.amount), 0) AS total FROM payments pay WHERE pay.tenant_id = p_tenant_id GROUP BY pay.status) s
      ), '[]'::jsonb),
      'aging', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('label', status, 'value', avg_days))
        FROM (
          SELECT pay.status, ROUND(AVG(EXTRACT(EPOCH FROM (now() - pay.created_at)) / 86400)::numeric, 1) AS avg_days
          FROM payments pay WHERE pay.tenant_id = p_tenant_id AND pay.status IN ('pending', 'approved', 'processing')
          GROUP BY pay.status
        ) a
      ), '[]'::jsonb)
    )
  )
  WHERE is_manager_of(p_tenant_id);
$$;

-- =============================================================================
-- DELIVERY DASHBOARD
-- =============================================================================
CREATE OR REPLACE FUNCTION get_analytics_delivery(
  p_tenant_id UUID,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH dr AS (SELECT * FROM analytics_date_range(p_from, p_to))
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'deliverables_total', (SELECT COUNT(*) FROM project_deliverables d JOIN projects p ON p.id = d.project_id WHERE p.tenant_id = p_tenant_id AND d.deleted_at IS NULL),
      'deliverables_submitted', (SELECT COUNT(*) FROM project_deliverables d JOIN projects p ON p.id = d.project_id WHERE p.tenant_id = p_tenant_id AND d.status = 'submitted' AND d.deleted_at IS NULL),
      'milestones_submitted', (SELECT COUNT(*) FROM milestones m JOIN projects p ON p.id = m.project_id, dr WHERE p.tenant_id = p_tenant_id AND m.status = 'submitted' AND m.deleted_at IS NULL AND m.updated_at BETWEEN dr.range_from AND dr.range_to),
      'milestones_approved', (SELECT COUNT(*) FROM milestones m JOIN projects p ON p.id = m.project_id, dr WHERE p.tenant_id = p_tenant_id AND m.status = 'approved' AND m.deleted_at IS NULL AND m.updated_at BETWEEN dr.range_from AND dr.range_to)
    ),
    'charts', jsonb_build_object(
      'deliverables_by_status', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('label', d.status, 'value', cnt))
        FROM (
          SELECT d.status, COUNT(*) AS cnt
          FROM project_deliverables d JOIN projects p ON p.id = d.project_id
          WHERE p.tenant_id = p_tenant_id AND d.deleted_at IS NULL
          GROUP BY d.status
        ) s
      ), '[]'::jsonb),
      'milestones_by_status', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('label', m.status, 'value', cnt))
        FROM (
          SELECT m.status, COUNT(*) AS cnt
          FROM milestones m JOIN projects p ON p.id = m.project_id
          WHERE p.tenant_id = p_tenant_id AND m.deleted_at IS NULL
          GROUP BY m.status
        ) s
      ), '[]'::jsonb),
      'submissions_over_time', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('x', month, 'y', cnt) ORDER BY month)
        FROM (
          SELECT date_trunc('month', d.created_at)::date AS month, COUNT(*) AS cnt
          FROM project_deliverables d JOIN projects p ON p.id = d.project_id, dr
          WHERE p.tenant_id = p_tenant_id AND d.deleted_at IS NULL AND d.created_at BETWEEN dr.range_from AND dr.range_to
          GROUP BY 1
        ) t
      ), '[]'::jsonb)
    )
  )
  WHERE is_manager_of(p_tenant_id);
$$;

-- =============================================================================
-- AI USAGE DASHBOARD
-- =============================================================================
CREATE OR REPLACE FUNCTION get_analytics_ai_usage(
  p_tenant_id UUID,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH dr AS (SELECT * FROM analytics_date_range(p_from, p_to))
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'total_requests', (SELECT COUNT(*) FROM ai_requests ar, dr WHERE ar.tenant_id = p_tenant_id AND ar.created_at BETWEEN dr.range_from AND dr.range_to),
      'completed', (SELECT COUNT(*) FROM ai_requests ar, dr WHERE ar.tenant_id = p_tenant_id AND ar.status = 'completed' AND ar.created_at BETWEEN dr.range_from AND dr.range_to),
      'failed', (SELECT COUNT(*) FROM ai_requests ar, dr WHERE ar.tenant_id = p_tenant_id AND ar.status = 'failed' AND ar.created_at BETWEEN dr.range_from AND dr.range_to),
      'total_tokens', (SELECT COALESCE(SUM(COALESCE(ar.input_tokens, 0) + COALESCE(ar.output_tokens, 0)), 0) FROM ai_requests ar, dr WHERE ar.tenant_id = p_tenant_id AND ar.created_at BETWEEN dr.range_from AND dr.range_to),
      'estimated_cost', (SELECT COALESCE(SUM(ar.estimated_cost), 0) FROM ai_requests ar, dr WHERE ar.tenant_id = p_tenant_id AND ar.created_at BETWEEN dr.range_from AND dr.range_to)
    ),
    'charts', jsonb_build_object(
      'by_feature', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('label', request_type, 'value', cnt) ORDER BY cnt DESC)
        FROM (
          SELECT ar.request_type, COUNT(*) AS cnt FROM ai_requests ar, dr
          WHERE ar.tenant_id = p_tenant_id AND ar.created_at BETWEEN dr.range_from AND dr.range_to
          GROUP BY ar.request_type
        ) f
      ), '[]'::jsonb),
      'tokens_over_time', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('x', month, 'y', tokens) ORDER BY month)
        FROM (
          SELECT date_trunc('month', ar.created_at)::date AS month,
            COALESCE(SUM(COALESCE(ar.input_tokens, 0) + COALESCE(ar.output_tokens, 0)), 0) AS tokens
          FROM ai_requests ar, dr
          WHERE ar.tenant_id = p_tenant_id AND ar.created_at BETWEEN dr.range_from AND dr.range_to
          GROUP BY 1
        ) t
      ), '[]'::jsonb),
      'cost_by_provider', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('label', provider, 'value', cost))
        FROM (
          SELECT ar.provider::text, COALESCE(SUM(ar.estimated_cost), 0) AS cost
          FROM ai_requests ar, dr
          WHERE ar.tenant_id = p_tenant_id AND ar.created_at BETWEEN dr.range_from AND dr.range_to
          GROUP BY ar.provider
        ) p
      ), '[]'::jsonb)
    )
  )
  WHERE is_manager_of(p_tenant_id);
$$;

-- =============================================================================
-- WORKFLOW PERFORMANCE DASHBOARD
-- =============================================================================
CREATE OR REPLACE FUNCTION get_analytics_workflow_performance(
  p_tenant_id UUID,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH dr AS (SELECT * FROM analytics_date_range(p_from, p_to))
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'total_runs', (SELECT COUNT(*) FROM workflow_runs wr, dr WHERE wr.tenant_id = p_tenant_id AND wr.created_at BETWEEN dr.range_from AND dr.range_to),
      'running', (SELECT COUNT(*) FROM workflow_runs wr WHERE wr.tenant_id = p_tenant_id AND wr.status IN ('pending', 'running', 'waiting_approval')),
      'failed', (SELECT COUNT(*) FROM workflow_runs wr, dr WHERE wr.tenant_id = p_tenant_id AND wr.status = 'failed' AND wr.created_at BETWEEN dr.range_from AND dr.range_to),
      'avg_duration_ms', (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (wr.completed_at - wr.started_at)) * 1000), 0) FROM workflow_runs wr, dr WHERE wr.tenant_id = p_tenant_id AND wr.completed_at IS NOT NULL AND wr.started_at IS NOT NULL AND wr.created_at BETWEEN dr.range_from AND dr.range_to),
      'dead_letter_jobs', (SELECT COUNT(*) FROM workflow_jobs wj WHERE wj.tenant_id = p_tenant_id AND wj.status = 'dead_letter')
    ),
    'charts', jsonb_build_object(
      'runs_by_status', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('label', status, 'value', cnt))
        FROM (SELECT wr.status, COUNT(*) AS cnt FROM workflow_runs wr, dr WHERE wr.tenant_id = p_tenant_id AND wr.created_at BETWEEN dr.range_from AND dr.range_to GROUP BY wr.status) s
      ), '[]'::jsonb),
      'runs_over_time', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('x', month, 'y', cnt) ORDER BY month)
        FROM (
          SELECT date_trunc('month', wr.created_at)::date AS month, COUNT(*) AS cnt
          FROM workflow_runs wr, dr
          WHERE wr.tenant_id = p_tenant_id AND wr.created_at BETWEEN dr.range_from AND dr.range_to
          GROUP BY 1
        ) t
      ), '[]'::jsonb),
      'top_workflows', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('label', workflow_id, 'value', cnt) ORDER BY cnt DESC)
        FROM (
          SELECT wr.workflow_id, COUNT(*) AS cnt FROM workflow_runs wr, dr
          WHERE wr.tenant_id = p_tenant_id AND wr.created_at BETWEEN dr.range_from AND dr.range_to
          GROUP BY wr.workflow_id ORDER BY cnt DESC LIMIT 10
        ) top
      ), '[]'::jsonb)
    )
  )
  WHERE is_manager_of(p_tenant_id);
$$;

-- =============================================================================
-- MODULE SUMMARY (all dashboards overview)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_analytics_module_summary(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'organizations', (SELECT (get_analytics_organizations(p_tenant_id)->'summary')),
    'projects', (SELECT (get_analytics_projects(p_tenant_id)->'summary')),
    'talent', (SELECT (get_analytics_talent(p_tenant_id)->'summary')),
    'utilization', (SELECT (get_analytics_utilization(p_tenant_id)->'summary')),
    'revenue', (SELECT (get_analytics_revenue(p_tenant_id)->'summary')),
    'delivery', (SELECT (get_analytics_delivery(p_tenant_id)->'summary')),
    'ai_usage', (SELECT (get_analytics_ai_usage(p_tenant_id)->'summary')),
    'workflows', (SELECT (get_analytics_workflow_performance(p_tenant_id)->'summary')),
    'legacy', (SELECT row_to_json(v)::jsonb FROM v_dashboard_summary v WHERE v.tenant_id = p_tenant_id LIMIT 1)
  )
  WHERE is_manager_of(p_tenant_id);
$$;

-- =============================================================================
-- GRANTS
-- =============================================================================
REVOKE ALL ON FUNCTION get_analytics_organizations(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_analytics_projects(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_analytics_talent(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_analytics_utilization(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_analytics_revenue(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_analytics_delivery(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_analytics_ai_usage(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_analytics_workflow_performance(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_analytics_module_summary(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION get_analytics_organizations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_projects(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_talent(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_utilization(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_revenue(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_delivery(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_ai_usage(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_workflow_performance(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_module_summary(UUID) TO authenticated;

COMMENT ON TABLE analytics_exports IS 'Analytics dashboard export history and downloadable content';
COMMENT ON TABLE analytics_cache_snapshots IS 'Optional persisted analytics cache snapshots';
