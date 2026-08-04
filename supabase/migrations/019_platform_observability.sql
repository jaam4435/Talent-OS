-- Talent OS — Platform Observability
-- Depends on: 005, 014, 018
-- Structured logs, metrics, traces, alerts + health views

CREATE TYPE platform_log_level AS ENUM ('debug', 'info', 'warn', 'error');
CREATE TYPE platform_metric_type AS ENUM ('counter', 'gauge', 'histogram');
CREATE TYPE platform_alert_severity AS ENUM ('info', 'warning', 'critical');
CREATE TYPE platform_alert_status AS ENUM ('open', 'acknowledged', 'resolved');

-- =============================================================================
-- STRUCTURED LOGS
-- =============================================================================
CREATE TABLE platform_log_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id) ON DELETE SET NULL,
  level             platform_log_level NOT NULL DEFAULT 'info',
  message           TEXT NOT NULL,
  category          TEXT NOT NULL,
  correlation_id    TEXT,
  request_id        TEXT,
  trace_id          TEXT,
  span_id           TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  error_code        TEXT,
  duration_ms       INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_platform_logs_tenant ON platform_log_entries(tenant_id, created_at DESC);
CREATE INDEX idx_platform_logs_category ON platform_log_entries(category, created_at DESC);
CREATE INDEX idx_platform_logs_correlation ON platform_log_entries(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX idx_platform_logs_level ON platform_log_entries(level, created_at DESC) WHERE level IN ('warn', 'error');

-- =============================================================================
-- METRICS (time-series points)
-- =============================================================================
CREATE TABLE platform_metric_points (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  metric_type       platform_metric_type NOT NULL DEFAULT 'gauge',
  value             NUMERIC NOT NULL,
  unit              TEXT,
  tags              JSONB NOT NULL DEFAULT '{}',
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_platform_metrics_name ON platform_metric_points(name, recorded_at DESC);
CREATE INDEX idx_platform_metrics_tenant ON platform_metric_points(tenant_id, name, recorded_at DESC);

-- =============================================================================
-- DISTRIBUTED TRACING SPANS
-- =============================================================================
CREATE TABLE platform_trace_spans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id) ON DELETE SET NULL,
  trace_id          TEXT NOT NULL,
  span_id           TEXT NOT NULL,
  parent_span_id    TEXT,
  operation         TEXT NOT NULL,
  service           TEXT NOT NULL DEFAULT 'talent-os',
  status            TEXT NOT NULL DEFAULT 'ok',
  correlation_id    TEXT,
  request_id        TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at          TIMESTAMPTZ,
  duration_ms       INTEGER
);

CREATE INDEX idx_platform_traces_trace ON platform_trace_spans(trace_id, started_at ASC);
CREATE INDEX idx_platform_traces_correlation ON platform_trace_spans(correlation_id) WHERE correlation_id IS NOT NULL;

-- =============================================================================
-- ALERTS
-- =============================================================================
CREATE TABLE platform_alerts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id) ON DELETE SET NULL,
  rule_id           TEXT NOT NULL,
  severity          platform_alert_severity NOT NULL DEFAULT 'warning',
  status            platform_alert_status NOT NULL DEFAULT 'open',
  title             TEXT NOT NULL,
  message           TEXT NOT NULL,
  metric_value      NUMERIC,
  threshold_value   NUMERIC,
  metadata          JSONB NOT NULL DEFAULT '{}',
  fired_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at   TIMESTAMPTZ,
  resolved_at       TIMESTAMPTZ
);

CREATE INDEX idx_platform_alerts_open ON platform_alerts(status, fired_at DESC) WHERE status = 'open';
CREATE INDEX idx_platform_alerts_tenant ON platform_alerts(tenant_id, fired_at DESC);
CREATE UNIQUE INDEX idx_platform_alerts_dedup
  ON platform_alerts(rule_id, tenant_id, status)
  WHERE status = 'open';

-- =============================================================================
-- OBSERVABILITY VIEWS
-- =============================================================================
CREATE OR REPLACE VIEW v_observability_workflow_health AS
SELECT
  tenant_id,
  count(*) FILTER (WHERE status = 'running') AS running_count,
  count(*) FILTER (WHERE status = 'completed') AS completed_count,
  count(*) FILTER (WHERE status = 'failed') AS failed_count,
  count(*) FILTER (WHERE status = 'failed' AND created_at > now() - interval '24 hours') AS failed_24h,
  avg(extract(epoch FROM (completed_at - started_at)) * 1000) FILTER (WHERE completed_at IS NOT NULL AND started_at IS NOT NULL) AS avg_duration_ms
FROM workflow_runs
WHERE created_at > now() - interval '7 days'
GROUP BY tenant_id;

CREATE OR REPLACE VIEW v_observability_queue_depth AS
SELECT
  'domain_events' AS queue_name,
  tenant_id,
  status,
  count(*) AS item_count,
  min(created_at) AS oldest_item,
  max(created_at) AS newest_item
FROM domain_events
WHERE status IN ('pending', 'processing', 'failed', 'dead_letter')
GROUP BY tenant_id, status
UNION ALL
SELECT
  'workflow_jobs' AS queue_name,
  tenant_id,
  status,
  count(*) AS item_count,
  min(created_at) AS oldest_item,
  max(created_at) AS newest_item
FROM workflow_jobs
WHERE status IN ('pending', 'processing', 'failed')
GROUP BY tenant_id, status;

CREATE OR REPLACE VIEW v_observability_notification_delivery AS
SELECT
  tenant_id,
  'in_app' AS channel,
  count(*) AS total_count,
  count(*) FILTER (WHERE read_at IS NOT NULL) AS delivered_count,
  count(*) FILTER (WHERE read_at IS NULL) AS pending_count
FROM notifications
WHERE created_at > now() - interval '30 days'
GROUP BY tenant_id
UNION ALL
SELECT
  tenant_id,
  'email' AS channel,
  count(*) AS total_count,
  count(*) FILTER (WHERE status IN ('sent', 'delivered')) AS delivered_count,
  count(*) FILTER (WHERE status IN ('queued', 'failed', 'bounced')) AS pending_count
FROM email_logs
WHERE created_at > now() - interval '30 days'
GROUP BY tenant_id
UNION ALL
SELECT
  tenant_id,
  'whatsapp' AS channel,
  count(*) AS total_count,
  count(*) FILTER (WHERE status IN ('delivered', 'read')) AS delivered_count,
  count(*) FILTER (WHERE status NOT IN ('delivered', 'read', 'failed')) AS pending_count
FROM whatsapp_messages
WHERE created_at > now() - interval '30 days'
GROUP BY tenant_id;

CREATE OR REPLACE VIEW v_observability_ai_latency AS
SELECT
  tenant_id,
  request_type,
  provider,
  count(*) AS request_count,
  avg(duration_ms) AS avg_latency_ms,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_latency_ms,
  sum(estimated_cost) AS total_cost,
  count(*) FILTER (WHERE status = 'failed') AS failed_count
FROM ai_requests
WHERE created_at > now() - interval '24 hours'
  AND duration_ms IS NOT NULL
GROUP BY tenant_id, request_type, provider;

CREATE OR REPLACE VIEW v_observability_failures_24h AS
SELECT
  tenant_id,
  'domain_events' AS source,
  status,
  count(*) AS failure_count,
  max(last_error) AS sample_error
FROM domain_events
WHERE created_at > now() - interval '24 hours'
  AND status IN ('failed', 'dead_letter')
GROUP BY tenant_id, status
UNION ALL
SELECT
  tenant_id,
  'workflow_runs' AS source,
  status,
  count(*) AS failure_count,
  max(last_error) AS sample_error
FROM workflow_runs
WHERE created_at > now() - interval '24 hours'
  AND status = 'failed'
GROUP BY tenant_id, status
UNION ALL
SELECT
  tenant_id,
  'ai_requests' AS source,
  status::text,
  count(*) AS failure_count,
  max(error_message) AS sample_error
FROM ai_requests
WHERE created_at > now() - interval '24 hours'
  AND status = 'failed'
GROUP BY tenant_id, status;

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE platform_log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_metric_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_trace_spans ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_logs_manager" ON platform_log_entries FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR is_manager_of(tenant_id));

CREATE POLICY "platform_metrics_manager" ON platform_metric_points FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR is_manager_of(tenant_id));

CREATE POLICY "platform_traces_manager" ON platform_trace_spans FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR is_manager_of(tenant_id));

CREATE POLICY "platform_alerts_manager" ON platform_alerts FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR is_manager_of(tenant_id));

CREATE POLICY "platform_alerts_update_admin" ON platform_alerts FOR UPDATE TO authenticated
  USING (tenant_id IS NULL OR is_manager_of(tenant_id));

GRANT SELECT ON v_observability_workflow_health TO authenticated;
GRANT SELECT ON v_observability_queue_depth TO authenticated;
GRANT SELECT ON v_observability_notification_delivery TO authenticated;
GRANT SELECT ON v_observability_ai_latency TO authenticated;
GRANT SELECT ON v_observability_failures_24h TO authenticated;

COMMENT ON TABLE platform_log_entries IS 'Structured platform logs with correlation and trace IDs';
COMMENT ON TABLE platform_metric_points IS 'Time-series metric points for dashboards and alerts';
COMMENT ON TABLE platform_trace_spans IS 'Distributed trace spans linked by trace_id';
COMMENT ON TABLE platform_alerts IS 'Platform alert records with lifecycle status';
