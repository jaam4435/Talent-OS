-- Talent OS — Event Infrastructure Migration
-- Depends on: 001–004
-- Supports: Event-Driven Architecture, Webhook Gateway, AI Governance

-- =============================================================================
-- DOMAIN EVENTS (Transactional Outbox)
-- =============================================================================
CREATE TYPE event_status AS ENUM (
  'pending', 'processing', 'delivered', 'failed', 'dead_letter'
);

CREATE TABLE domain_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type        TEXT NOT NULL,
  aggregate_type    TEXT NOT NULL,
  aggregate_id      UUID NOT NULL,
  idempotency_key   TEXT NOT NULL,
  correlation_id    UUID NOT NULL DEFAULT gen_random_uuid(),
  actor_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  payload           JSONB NOT NULL DEFAULT '{}',
  status            event_status NOT NULL DEFAULT 'pending',
  retry_count       INTEGER NOT NULL DEFAULT 0,
  max_retries       INTEGER NOT NULL DEFAULT 5,
  last_error        TEXT,
  scheduled_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at      TIMESTAMPTZ,
  UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX idx_domain_events_pending ON domain_events(created_at)
  WHERE status = 'pending';
CREATE INDEX idx_domain_events_tenant ON domain_events(tenant_id, event_type);
CREATE INDEX idx_domain_events_correlation ON domain_events(correlation_id);
CREATE INDEX idx_domain_events_aggregate ON domain_events(aggregate_type, aggregate_id);

-- =============================================================================
-- WEBHOOK DELIVERIES (Inbound Idempotency + Audit)
-- =============================================================================
CREATE TABLE webhook_deliveries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id) ON DELETE SET NULL,
  source            TEXT NOT NULL,           -- whatsapp, n8n, stripe
  idempotency_key   TEXT NOT NULL,
  correlation_id    UUID,
  event_type        TEXT,
  payload           JSONB NOT NULL DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'received',  -- received, processed, failed, duplicate
  response_code     INTEGER,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at      TIMESTAMPTZ,
  UNIQUE (source, idempotency_key)
);

CREATE INDEX idx_webhook_deliveries_source ON webhook_deliveries(source, created_at DESC);
CREATE INDEX idx_webhook_deliveries_tenant ON webhook_deliveries(tenant_id);

-- Auto-purge webhook deliveries older than 72 hours (via n8n cron or pg_cron)
-- DELETE FROM webhook_deliveries WHERE created_at < now() - interval '72 hours';

-- =============================================================================
-- EMAIL LOGS
-- =============================================================================
CREATE TABLE email_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  freelancer_id     UUID REFERENCES freelancers(id) ON DELETE SET NULL,
  user_id           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  to_email          TEXT NOT NULL,
  template_name     TEXT NOT NULL,
  subject           TEXT,
  status            TEXT NOT NULL DEFAULT 'queued',  -- queued, sent, delivered, bounced, failed
  provider_id       TEXT,                            -- Resend message ID
  entity_type       TEXT,
  entity_id         UUID,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_logs_tenant ON email_logs(tenant_id, created_at DESC);
CREATE INDEX idx_email_logs_status ON email_logs(tenant_id, status);

-- =============================================================================
-- AI REQUESTS (Governance + Cost Tracking)
-- =============================================================================
CREATE TYPE ai_provider AS ENUM ('openai', 'claude');
CREATE TYPE ai_request_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE ai_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  correlation_id    UUID,
  provider          ai_provider NOT NULL,
  model             TEXT NOT NULL,
  request_type      TEXT NOT NULL,           -- talent_match, brief_parse, shortlist_summary, digest
  entity_type       TEXT,
  entity_id         UUID,
  prompt_hash       TEXT,                    -- SHA-256 of prompt (not raw prompt for privacy)
  input_tokens      INTEGER,
  output_tokens     INTEGER,
  estimated_cost    NUMERIC(10, 6),
  status            ai_request_status NOT NULL DEFAULT 'pending',
  result            JSONB,
  error_message     TEXT,
  duration_ms       INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ
);

CREATE INDEX idx_ai_requests_tenant ON ai_requests(tenant_id, created_at DESC);
CREATE INDEX idx_ai_requests_type ON ai_requests(tenant_id, request_type);
CREATE INDEX idx_ai_requests_entity ON ai_requests(entity_type, entity_id);
CREATE INDEX idx_ai_requests_correlation ON ai_requests(correlation_id);

-- =============================================================================
-- TALENT MATCH SCORES (AI Output)
-- =============================================================================
CREATE TABLE talent_match_scores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  opportunity_id    UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  freelancer_id     UUID NOT NULL REFERENCES freelancers(id) ON DELETE CASCADE,
  ai_request_id     UUID REFERENCES ai_requests(id) ON DELETE SET NULL,
  score             NUMERIC(5, 2) NOT NULL CHECK (score >= 0 AND score <= 100),
  rationale         TEXT,
  skill_overlap     TEXT[],
  rank              INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, freelancer_id)
);

CREATE INDEX idx_match_scores_opportunity ON talent_match_scores(opportunity_id, score DESC);
CREATE INDEX idx_match_scores_tenant ON talent_match_scores(tenant_id);

-- =============================================================================
-- HELPER: EMIT DOMAIN EVENT (called from app or triggers)
-- =============================================================================
CREATE OR REPLACE FUNCTION emit_domain_event(
  p_tenant_id UUID,
  p_event_type TEXT,
  p_aggregate_type TEXT,
  p_aggregate_id UUID,
  p_idempotency_key TEXT,
  p_payload JSONB DEFAULT '{}',
  p_actor_id UUID DEFAULT NULL,
  p_correlation_id UUID DEFAULT NULL,
  p_scheduled_at TIMESTAMPTZ DEFAULT now()
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO domain_events (
    tenant_id, event_type, aggregate_type, aggregate_id,
    idempotency_key, correlation_id, actor_id, payload, scheduled_at
  ) VALUES (
    p_tenant_id, p_event_type, p_aggregate_type, p_aggregate_id,
    p_idempotency_key, COALESCE(p_correlation_id, gen_random_uuid()),
    p_actor_id, p_payload, p_scheduled_at
  )
  ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGER: EMIT EVENTS ON KEY DOMAIN CHANGES
-- =============================================================================
CREATE OR REPLACE FUNCTION trg_emit_opportunity_broadcast()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'open' AND (OLD.status IS DISTINCT FROM 'open') THEN
    PERFORM emit_domain_event(
      NEW.tenant_id,
      'opportunity.opened',
      'opportunity',
      NEW.id,
      'opportunity.opened:' || NEW.id::text,
      jsonb_build_object('title', NEW.title, 'created_by', NEW.created_by),
      NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_opportunity_opened
  AFTER UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION trg_emit_opportunity_broadcast();

CREATE OR REPLACE FUNCTION trg_emit_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM emit_domain_event(
      NEW.tenant_id,
      'payment.' || NEW.status::text,
      'payment',
      NEW.id,
      'payment.' || NEW.status::text || ':' || NEW.id::text,
      jsonb_build_object(
        'amount', NEW.amount,
        'currency', NEW.currency,
        'freelancer_id', NEW.freelancer_id,
        'project_id', NEW.project_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_payment_status_change
  AFTER UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION trg_emit_payment_status();

-- =============================================================================
-- RLS POLICIES
-- =============================================================================
ALTER TABLE domain_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_match_scores ENABLE ROW LEVEL SECURITY;

-- Domain events: managers can read their tenant's events
CREATE POLICY "domain_events_select" ON domain_events FOR SELECT
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

-- Email logs: managers read, service role writes
CREATE POLICY "email_logs_select" ON email_logs FOR SELECT
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

-- AI requests: managers read
CREATE POLICY "ai_requests_select" ON ai_requests FOR SELECT
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

-- Match scores: managers read
CREATE POLICY "match_scores_select" ON talent_match_scores FOR SELECT
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

-- Webhook deliveries: admin only
CREATE POLICY "webhook_deliveries_select" ON webhook_deliveries FOR SELECT
  USING (tenant_id IN (SELECT public.admin_tenant_ids()));

-- =============================================================================
-- ANALYTICS VIEWS
-- =============================================================================
CREATE OR REPLACE VIEW v_ai_usage AS
SELECT
  tenant_id,
  date_trunc('month', created_at) AS month,
  provider,
  request_type,
  count(*) AS request_count,
  sum(input_tokens) AS total_input_tokens,
  sum(output_tokens) AS total_output_tokens,
  sum(estimated_cost) AS total_cost
FROM ai_requests
WHERE status = 'completed'
GROUP BY tenant_id, date_trunc('month', created_at), provider, request_type;

CREATE OR REPLACE VIEW v_event_pipeline_health AS
SELECT
  tenant_id,
  status,
  count(*) AS event_count,
  min(created_at) AS oldest,
  max(created_at) AS newest
FROM domain_events
WHERE created_at > now() - interval '24 hours'
GROUP BY tenant_id, status;

GRANT SELECT ON v_ai_usage TO authenticated;
GRANT SELECT ON v_event_pipeline_health TO authenticated;
