-- Talent OS — Agent Framework extension
-- Depends on: 017_agents_module
-- Adds Support agent, conversation messages, reasoning/conversation policies.

ALTER TYPE agent_id ADD VALUE IF NOT EXISTS 'support';

ALTER TABLE agent_configs
  ADD COLUMN IF NOT EXISTS reasoning_policy JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS conversation_policy JSONB NOT NULL DEFAULT '{}';

CREATE TYPE agent_message_role AS ENUM (
  'user',
  'assistant',
  'system',
  'tool'
);

CREATE TABLE agent_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id        UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  agent_id          agent_id NOT NULL,
  role              agent_message_role NOT NULL,
  content           TEXT NOT NULL,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_messages_session ON agent_messages(session_id, created_at ASC);
CREATE INDEX idx_agent_messages_tenant ON agent_messages(tenant_id, agent_id, created_at DESC);

ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_messages_select_manager" ON agent_messages FOR SELECT TO authenticated
  USING (is_manager_of(tenant_id));

CREATE POLICY "agent_messages_insert_manager" ON agent_messages FOR INSERT TO authenticated
  WITH CHECK (is_manager_of(tenant_id));

COMMENT ON TABLE agent_messages IS 'Agent conversation turn history — user, assistant, and tool messages';
COMMENT ON COLUMN agent_configs.reasoning_policy IS 'Configurable reasoning loop: maxSteps, toolUseEnabled, temperature, maxTokens';
COMMENT ON COLUMN agent_configs.conversation_policy IS 'Configurable conversation state: maxHistoryMessages, persistToolResults, autoSummarize';
