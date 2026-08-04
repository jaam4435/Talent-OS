-- Talent OS — Database Performance P1 (Sprint 21)
-- Depends on: 001–034
-- Addresses DATABASE_ALIGNMENT_REPORT.md §2.1–2.2 and §9 P1
--
-- Production runbook: replace CREATE INDEX with CREATE INDEX CONCURRENTLY
-- (cannot run inside a transaction block). Example:
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_tenant_status_created ...

-- =============================================================================
-- EXTENSIONS (text search)
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================================
-- PAYMENTS — revenue analytics
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_payments_tenant_status_created
  ON payments (tenant_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_payments_paid_at
  ON payments (paid_at)
  WHERE paid_at IS NOT NULL;

-- =============================================================================
-- DOMAIN EVENTS — cron dispatch / retry scheduling
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_domain_events_status_scheduled
  ON domain_events (status, scheduled_at)
  WHERE status IN ('pending', 'failed');

-- =============================================================================
-- WHATSAPP MESSAGES — observability and inbound routing
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant_created
  ON whatsapp_messages (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone_tenant
  ON whatsapp_messages (phone, tenant_id);

-- =============================================================================
-- OPPORTUNITY RECIPIENTS — pending WhatsApp YES/NO lookup
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_opp_recipients_freelancer_pending
  ON opportunity_recipients (freelancer_id, response)
  WHERE response = 'pending';

-- =============================================================================
-- WORKFLOW JOBS — dead-letter admin / analytics
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_workflow_jobs_dead_letter
  ON workflow_jobs (tenant_id, status)
  WHERE status = 'dead_letter';

-- =============================================================================
-- CRM AUDIT LOGS — entity lookup parity
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_crm_audit_entity
  ON crm_audit_logs (tenant_id, entity_type, entity_id);

-- =============================================================================
-- ACTIVITY LOGS — filtered audit queries
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant_action_created
  ON activity_logs (tenant_id, action, created_at DESC);

-- =============================================================================
-- COMPANIES — name lookup and fuzzy search
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_companies_tenant_lower_name
  ON companies (tenant_id, lower(name))
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_companies_name_trgm
  ON companies USING gin (name gin_trgm_ops);

-- =============================================================================
-- FREELANCERS — full-text / trigram name search
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_freelancers_name_trgm
  ON freelancers USING gin (full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_freelancers_search_tsvector
  ON freelancers USING gin (
    to_tsvector('simple', full_name || ' ' || coalesce(email, ''))
  );

CREATE INDEX IF NOT EXISTS idx_freelancers_tenant_phone_active
  ON freelancers (tenant_id, phone)
  WHERE deleted_at IS NULL AND phone IS NOT NULL;

-- =============================================================================
-- PROJECTS — freelancer dashboard
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_projects_freelancer_status_active
  ON projects (freelancer_id, status)
  WHERE deleted_at IS NULL;

-- =============================================================================
-- MILESTONES — overdue cron (status + due_date composite)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_milestones_status_due_open
  ON milestones (status, due_date)
  WHERE status NOT IN ('approved', 'canceled') AND deleted_at IS NULL;

-- =============================================================================
-- ANALYTICS CACHE SNAPSHOTS — refresh helper for cron
-- =============================================================================
CREATE OR REPLACE FUNCTION refresh_analytics_tenant_snapshots(
  p_tenant_id UUID,
  p_ttl_minutes INT DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expires TIMESTAMPTZ := now() + make_interval(mins => p_ttl_minutes);
  v_count INT := 0;
  v_payload JSONB;
BEGIN
  IF NOT is_manager_of(p_tenant_id) AND NOT (auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  -- Organizations
  v_payload := get_analytics_organizations(p_tenant_id);
  INSERT INTO analytics_cache_snapshots (tenant_id, cache_key, dashboard, payload, expires_at)
  VALUES (p_tenant_id, 'organizations', 'organizations', v_payload, v_expires)
  ON CONFLICT (tenant_id, cache_key)
  DO UPDATE SET payload = EXCLUDED.payload, expires_at = EXCLUDED.expires_at, created_at = now();
  v_count := v_count + 1;

  -- Projects (default 30d window)
  v_payload := get_analytics_projects(p_tenant_id, NULL, NULL);
  INSERT INTO analytics_cache_snapshots (tenant_id, cache_key, dashboard, payload, expires_at)
  VALUES (p_tenant_id, 'projects', 'projects', v_payload, v_expires)
  ON CONFLICT (tenant_id, cache_key)
  DO UPDATE SET payload = EXCLUDED.payload, expires_at = EXCLUDED.expires_at, created_at = now();
  v_count := v_count + 1;

  -- Talent
  v_payload := get_analytics_talent(p_tenant_id);
  INSERT INTO analytics_cache_snapshots (tenant_id, cache_key, dashboard, payload, expires_at)
  VALUES (p_tenant_id, 'talent', 'talent', v_payload, v_expires)
  ON CONFLICT (tenant_id, cache_key)
  DO UPDATE SET payload = EXCLUDED.payload, expires_at = EXCLUDED.expires_at, created_at = now();
  v_count := v_count + 1;

  -- Utilization
  v_payload := get_analytics_utilization(p_tenant_id, NULL, NULL);
  INSERT INTO analytics_cache_snapshots (tenant_id, cache_key, dashboard, payload, expires_at)
  VALUES (p_tenant_id, 'utilization', 'utilization', v_payload, v_expires)
  ON CONFLICT (tenant_id, cache_key)
  DO UPDATE SET payload = EXCLUDED.payload, expires_at = EXCLUDED.expires_at, created_at = now();
  v_count := v_count + 1;

  -- Revenue
  v_payload := get_analytics_revenue(p_tenant_id, NULL, NULL);
  INSERT INTO analytics_cache_snapshots (tenant_id, cache_key, dashboard, payload, expires_at)
  VALUES (p_tenant_id, 'revenue', 'revenue', v_payload, v_expires)
  ON CONFLICT (tenant_id, cache_key)
  DO UPDATE SET payload = EXCLUDED.payload, expires_at = EXCLUDED.expires_at, created_at = now();
  v_count := v_count + 1;

  -- Delivery
  v_payload := get_analytics_delivery(p_tenant_id, NULL, NULL);
  INSERT INTO analytics_cache_snapshots (tenant_id, cache_key, dashboard, payload, expires_at)
  VALUES (p_tenant_id, 'delivery', 'delivery', v_payload, v_expires)
  ON CONFLICT (tenant_id, cache_key)
  DO UPDATE SET payload = EXCLUDED.payload, expires_at = EXCLUDED.expires_at, created_at = now();
  v_count := v_count + 1;

  -- AI usage
  v_payload := get_analytics_ai_usage(p_tenant_id, NULL, NULL);
  INSERT INTO analytics_cache_snapshots (tenant_id, cache_key, dashboard, payload, expires_at)
  VALUES (p_tenant_id, 'ai_usage', 'ai_usage', v_payload, v_expires)
  ON CONFLICT (tenant_id, cache_key)
  DO UPDATE SET payload = EXCLUDED.payload, expires_at = EXCLUDED.expires_at, created_at = now();
  v_count := v_count + 1;

  -- Workflows
  v_payload := get_analytics_workflow_performance(p_tenant_id, NULL, NULL);
  INSERT INTO analytics_cache_snapshots (tenant_id, cache_key, dashboard, payload, expires_at)
  VALUES (p_tenant_id, 'workflows', 'workflows', v_payload, v_expires)
  ON CONFLICT (tenant_id, cache_key)
  DO UPDATE SET payload = EXCLUDED.payload, expires_at = EXCLUDED.expires_at, created_at = now();
  v_count := v_count + 1;

  -- Module summary
  v_payload := get_analytics_module_summary(p_tenant_id);
  INSERT INTO analytics_cache_snapshots (tenant_id, cache_key, dashboard, payload, expires_at)
  VALUES (p_tenant_id, 'summary', 'summary', v_payload, v_expires)
  ON CONFLICT (tenant_id, cache_key)
  DO UPDATE SET payload = EXCLUDED.payload, expires_at = EXCLUDED.expires_at, created_at = now();
  v_count := v_count + 1;

  -- Purge expired snapshots (housekeeping)
  DELETE FROM analytics_cache_snapshots WHERE expires_at < now();

  RETURN jsonb_build_object('tenant_id', p_tenant_id, 'snapshots_refreshed', v_count, 'expires_at', v_expires);
END;
$$;

REVOKE ALL ON FUNCTION refresh_analytics_tenant_snapshots(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION refresh_analytics_tenant_snapshots(UUID, INT) TO service_role;

COMMENT ON FUNCTION refresh_analytics_tenant_snapshots IS
  'Pre-compute analytics dashboard payloads into analytics_cache_snapshots (cron / admin refresh)';

-- =============================================================================
-- ANALYTICS RPCs — allow service_role for cron snapshot refresh
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
  WHERE is_manager_of(p_tenant_id) OR auth.role() = 'service_role';
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
  WHERE is_manager_of(p_tenant_id) OR auth.role() = 'service_role';
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
  WHERE is_manager_of(p_tenant_id) OR auth.role() = 'service_role';
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
  WHERE is_manager_of(p_tenant_id) OR auth.role() = 'service_role';
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
  WHERE is_manager_of(p_tenant_id) OR auth.role() = 'service_role';
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
  WHERE is_manager_of(p_tenant_id) OR auth.role() = 'service_role';
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
  WHERE is_manager_of(p_tenant_id) OR auth.role() = 'service_role';
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
  WHERE is_manager_of(p_tenant_id) OR auth.role() = 'service_role';
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
  WHERE is_manager_of(p_tenant_id) OR auth.role() = 'service_role';
$$;

-- =============================================================================
-- GRANTS
-- =============================================================================
