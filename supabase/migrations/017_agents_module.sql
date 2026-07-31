-- Talent OS — Agent Framework
-- Depends on: 001, 016
-- Configurable agents: instructions (server-side), tools, memory, permissions.
-- No prompt content exposed via UI — managed in DB + PromptManager only.

-- =============================================================================
-- ENUMS
-- =============================================================================
CREATE TYPE agent_id AS ENUM (
  'recruiter',
  'project_manager',
  'finance',
  'qa',
  'executive',
  'knowledge'
);

CREATE TYPE agent_memory_scope AS ENUM (
  'session',
  'entity',
  'tenant'
);

CREATE TYPE agent_session_status AS ENUM (
  'active',
  'completed',
  'failed'
);

-- =============================================================================
-- AGENT CONFIGS (tenant overrides — no instruction text)
-- =============================================================================
CREATE TABLE agent_configs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id          agent_id NOT NULL,
  enabled           BOOLEAN NOT NULL DEFAULT true,
  instruction_prompt_id TEXT NOT NULL,
  instruction_version   TEXT,
  allowed_tools     TEXT[] NOT NULL DEFAULT '{}',
  required_permissions TEXT[] NOT NULL DEFAULT '{}',
  memory_policy     JSONB NOT NULL DEFAULT '{
    "scope": "session",
    "maxEntries": 50,
    "ttlHours": 168
  }',
  model_override    TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, agent_id)
);

CREATE INDEX idx_agent_configs_tenant ON agent_configs(tenant_id);

-- =============================================================================
-- INSTRUCTION VERSIONS (server-side only — never exposed to UI)
-- =============================================================================
CREATE TABLE agent_instruction_versions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id          agent_id NOT NULL,
  prompt_id         TEXT NOT NULL,
  version           TEXT NOT NULL,
  content           TEXT NOT NULL,
  active            BOOLEAN NOT NULL DEFAULT false,
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, agent_id, version)
);

CREATE INDEX idx_agent_instruction_versions_lookup
  ON agent_instruction_versions(agent_id, active)
  WHERE active = true;

-- =============================================================================
-- AGENT SESSIONS (conversation / run context)
-- =============================================================================
CREATE TABLE agent_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id          agent_id NOT NULL,
  user_id           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  entity_type       TEXT,
  entity_id         UUID,
  status            agent_session_status NOT NULL DEFAULT 'active',
  context           JSONB NOT NULL DEFAULT '{}',
  correlation_id    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ
);

CREATE INDEX idx_agent_sessions_tenant ON agent_sessions(tenant_id, agent_id, created_at DESC);
CREATE INDEX idx_agent_sessions_user ON agent_sessions(tenant_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_agent_sessions_entity ON agent_sessions(tenant_id, entity_type, entity_id)
  WHERE entity_type IS NOT NULL;

-- =============================================================================
-- AGENT MEMORY (persistent recall)
-- =============================================================================
CREATE TABLE agent_memory_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id          agent_id NOT NULL,
  session_id        UUID REFERENCES agent_sessions(id) ON DELETE SET NULL,
  scope             agent_memory_scope NOT NULL,
  entity_type       TEXT,
  entity_id         UUID,
  memory_key        TEXT NOT NULL,
  content           TEXT NOT NULL,
  metadata          JSONB NOT NULL DEFAULT '{}',
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_memory_tenant ON agent_memory_entries(tenant_id, agent_id);
CREATE INDEX idx_agent_memory_session ON agent_memory_entries(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_agent_memory_entity ON agent_memory_entries(tenant_id, agent_id, entity_type, entity_id)
  WHERE entity_type IS NOT NULL;
CREATE UNIQUE INDEX idx_agent_memory_unique_entity
  ON agent_memory_entries(tenant_id, agent_id, scope, entity_type, entity_id, memory_key)
  WHERE scope = 'entity' AND entity_type IS NOT NULL AND entity_id IS NOT NULL;
CREATE UNIQUE INDEX idx_agent_memory_unique_tenant
  ON agent_memory_entries(tenant_id, agent_id, memory_key)
  WHERE scope = 'tenant';

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_instruction_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_configs_select_manager" ON agent_configs FOR SELECT TO authenticated
  USING (is_manager_of(tenant_id));

CREATE POLICY "agent_configs_insert_manager" ON agent_configs FOR INSERT TO authenticated
  WITH CHECK (is_manager_of(tenant_id));

CREATE POLICY "agent_configs_update_manager" ON agent_configs FOR UPDATE TO authenticated
  USING (is_manager_of(tenant_id));

CREATE POLICY "agent_configs_delete_manager" ON agent_configs FOR DELETE TO authenticated
  USING (is_manager_of(tenant_id));

-- Instructions: managers can read metadata only via service layer filtering; no direct content exposure in UI
CREATE POLICY "agent_instruction_versions_manager" ON agent_instruction_versions FOR ALL TO authenticated
  USING (tenant_id IS NULL OR is_manager_of(tenant_id))
  WITH CHECK (tenant_id IS NULL OR is_manager_of(tenant_id));

CREATE POLICY "agent_sessions_select_manager" ON agent_sessions FOR SELECT TO authenticated
  USING (is_manager_of(tenant_id));

CREATE POLICY "agent_sessions_insert_manager" ON agent_sessions FOR INSERT TO authenticated
  WITH CHECK (is_manager_of(tenant_id));

CREATE POLICY "agent_sessions_update_manager" ON agent_sessions FOR UPDATE TO authenticated
  USING (is_manager_of(tenant_id));

CREATE POLICY "agent_memory_select_manager" ON agent_memory_entries FOR SELECT TO authenticated
  USING (is_manager_of(tenant_id));

CREATE POLICY "agent_memory_insert_manager" ON agent_memory_entries FOR INSERT TO authenticated
  WITH CHECK (is_manager_of(tenant_id));

CREATE POLICY "agent_memory_update_manager" ON agent_memory_entries FOR UPDATE TO authenticated
  USING (is_manager_of(tenant_id));

CREATE POLICY "agent_memory_delete_manager" ON agent_memory_entries FOR DELETE TO authenticated
  USING (is_manager_of(tenant_id));

CREATE TRIGGER trg_agent_configs_updated_at
  BEFORE UPDATE ON agent_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_agent_sessions_updated_at
  BEFORE UPDATE ON agent_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_agent_memory_updated_at
  BEFORE UPDATE ON agent_memory_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE agent_configs IS 'Tenant agent configuration: tools, memory, permissions — no instruction text';
COMMENT ON TABLE agent_instruction_versions IS 'Server-side agent instructions; never exposed in UI';
COMMENT ON TABLE agent_sessions IS 'Agent run sessions for conversation context';
COMMENT ON TABLE agent_memory_entries IS 'Persistent agent memory scoped by session, entity, or tenant';
