-- Talent OS — WhatsApp Platform Module
-- Depends on: 015 (whatsapp_conversations), 014 (approval_requests)

-- =============================================================================
-- AUDIT LOGS
-- =============================================================================
CREATE TABLE whatsapp_audit_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  freelancer_id     UUID REFERENCES freelancers(id) ON DELETE SET NULL,
  action            TEXT NOT NULL,
  entity_type       TEXT NOT NULL,
  entity_id         TEXT NOT NULL,
  channel           TEXT NOT NULL DEFAULT 'whatsapp',
  before_state      JSONB,
  after_state       JSONB,
  metadata          JSONB NOT NULL DEFAULT '{}',
  wa_message_id     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_audit_logs_tenant
  ON whatsapp_audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_whatsapp_audit_logs_freelancer
  ON whatsapp_audit_logs(tenant_id, freelancer_id, created_at DESC)
  WHERE freelancer_id IS NOT NULL;

-- =============================================================================
-- CONVERSATION MEMORY (turn history for AI + session recall)
-- =============================================================================
CREATE TABLE whatsapp_memory_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  freelancer_id     UUID NOT NULL REFERENCES freelancers(id) ON DELETE CASCADE,
  role              TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content           TEXT NOT NULL,
  intent            TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_memory_entries_session
  ON whatsapp_memory_entries(tenant_id, freelancer_id, created_at DESC);

-- =============================================================================
-- APPROVAL GATES (link workflow approvals to WhatsApp sessions)
-- =============================================================================
CREATE TABLE whatsapp_approval_gates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  approval_request_id   UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  freelancer_id         UUID REFERENCES freelancers(id) ON DELETE SET NULL,
  phone                 TEXT,
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'expired')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at           TIMESTAMPTZ,
  UNIQUE (approval_request_id)
);

CREATE INDEX idx_whatsapp_approval_gates_pending
  ON whatsapp_approval_gates(tenant_id, status)
  WHERE status = 'pending';

-- =============================================================================
-- CONVERSATION EXTENSIONS
-- =============================================================================
ALTER TABLE whatsapp_conversations
  ADD COLUMN IF NOT EXISTS memory_summary TEXT,
  ADD COLUMN IF NOT EXISTS pending_approval_id UUID REFERENCES approval_requests(id) ON DELETE SET NULL;

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE whatsapp_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_memory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_approval_gates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_audit_logs_select_manager" ON whatsapp_audit_logs FOR SELECT TO authenticated
  USING (is_manager_of(tenant_id));

CREATE POLICY "whatsapp_memory_entries_select_manager" ON whatsapp_memory_entries FOR SELECT TO authenticated
  USING (is_manager_of(tenant_id));

CREATE POLICY "whatsapp_memory_entries_select_own" ON whatsapp_memory_entries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM freelancers f
      WHERE f.id = whatsapp_memory_entries.freelancer_id AND f.user_id = auth.uid()
    )
  );

CREATE POLICY "whatsapp_approval_gates_select_manager" ON whatsapp_approval_gates FOR SELECT TO authenticated
  USING (is_manager_of(tenant_id));

-- =============================================================================
-- OBSERVABILITY RPC
-- =============================================================================
CREATE OR REPLACE FUNCTION get_whatsapp_module_summary(p_tenant_id UUID)
RETURNS TABLE (
  active_conversations BIGINT,
  messages_today BIGINT,
  intents_handled_today BIGINT,
  pending_approvals BIGINT,
  audit_entries_today BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM whatsapp_conversations
     WHERE tenant_id = p_tenant_id
       AND last_message_at > now() - interval '7 days'),
    (SELECT COUNT(*) FROM whatsapp_messages
     WHERE tenant_id = p_tenant_id
       AND direction = 'inbound'
       AND created_at > date_trunc('day', now())),
    (SELECT COUNT(*) FROM whatsapp_audit_logs
     WHERE tenant_id = p_tenant_id
       AND action LIKE 'whatsapp.intent.%'
       AND created_at > date_trunc('day', now())),
    (SELECT COUNT(*) FROM whatsapp_approval_gates
     WHERE tenant_id = p_tenant_id AND status = 'pending'),
    (SELECT COUNT(*) FROM whatsapp_audit_logs
     WHERE tenant_id = p_tenant_id
       AND created_at > date_trunc('day', now()));
$$;

REVOKE ALL ON FUNCTION get_whatsapp_module_summary(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_whatsapp_module_summary(UUID) TO authenticated;

COMMENT ON TABLE whatsapp_audit_logs IS 'WhatsApp platform operation audit trail';
COMMENT ON TABLE whatsapp_memory_entries IS 'Per-session conversation memory for AI context';
COMMENT ON TABLE whatsapp_approval_gates IS 'Workflow approval gates routable via WhatsApp';
