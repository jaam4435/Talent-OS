-- Talent OS — API idempotency persistence (distributed, multi-instance safe)
-- Depends on: 001, 005

CREATE TABLE IF NOT EXISTS api_idempotency_responses (
  idempotency_key TEXT PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  http_method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER NOT NULL CHECK (status_code BETWEEN 100 AND 599),
  response_body JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_idempotency_expires
  ON api_idempotency_responses(expires_at);

ALTER TABLE api_idempotency_responses ENABLE ROW LEVEL SECURITY;

-- Service role only — API platform writes via admin client
REVOKE ALL ON api_idempotency_responses FROM PUBLIC;
REVOKE ALL ON api_idempotency_responses FROM authenticated;
GRANT ALL ON api_idempotency_responses TO service_role;

COMMENT ON TABLE api_idempotency_responses IS
  'Distributed idempotency store for API Idempotency-Key header (24h TTL)';

-- Cleanup expired keys (optional cron or pg_cron)
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH deleted AS (
    DELETE FROM api_idempotency_responses
    WHERE expires_at < now()
    RETURNING 1
  )
  SELECT count(*)::INTEGER FROM deleted;
$$;

REVOKE ALL ON FUNCTION cleanup_expired_idempotency_keys() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_expired_idempotency_keys() TO service_role;
