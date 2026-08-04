-- Talent OS — Workflow Engine Module
-- Depends on: 005 (domain_events), 014 (workflow_runs/jobs)
-- Adds reusable definitions, execution history, compensation, audit

-- =============================================================================
-- ENUMS
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE workflow_execution_status AS ENUM (
    'started', 'completed', 'failed', 'skipped', 'compensated'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE workflow_compensation_status AS ENUM (
    'pending', 'processing', 'completed', 'failed', 'skipped'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- REUSABLE WORKFLOW DEFINITIONS (built-in + tenant custom)
-- =============================================================================
CREATE TABLE workflow_definitions (
  id                TEXT NOT NULL,
  tenant_id         UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  category          TEXT NOT NULL DEFAULT 'business',
  trigger_event_type TEXT NOT NULL,
  conditions        JSONB NOT NULL DEFAULT '[]',
  steps             JSONB NOT NULL DEFAULT '[]',
  compensation      JSONB NOT NULL DEFAULT '[]',
  queue_name        TEXT NOT NULL DEFAULT 'default',
  is_builtin        BOOLEAN NOT NULL DEFAULT false,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  version           INT NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, tenant_id)
);

CREATE UNIQUE INDEX idx_workflow_definitions_global
  ON workflow_definitions(id) WHERE tenant_id IS NULL;
CREATE INDEX idx_workflow_definitions_tenant
  ON workflow_definitions(tenant_id, is_active) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_workflow_definitions_trigger
  ON workflow_definitions(trigger_event_type) WHERE is_active = true;

-- =============================================================================
-- EXECUTION HISTORY (step-level audit trail)
-- =============================================================================
CREATE TABLE workflow_execution_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  run_id            UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  job_id            UUID REFERENCES workflow_jobs(id) ON DELETE SET NULL,
  step_id           TEXT NOT NULL,
  action_type       TEXT NOT NULL,
  status            workflow_execution_status NOT NULL,
  input             JSONB NOT NULL DEFAULT '{}',
  output            JSONB NOT NULL DEFAULT '{}',
  error             TEXT,
  duration_ms       INT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_execution_history_run
  ON workflow_execution_history(run_id, created_at);
CREATE INDEX idx_workflow_execution_history_tenant
  ON workflow_execution_history(tenant_id, created_at DESC);

-- =============================================================================
-- COMPENSATIONS (saga rollback actions after failures)
-- =============================================================================
CREATE TABLE workflow_compensations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  run_id            UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  job_id            UUID REFERENCES workflow_jobs(id) ON DELETE SET NULL,
  step_id           TEXT NOT NULL,
  action_type       TEXT NOT NULL,
  config            JSONB NOT NULL DEFAULT '{}',
  status            workflow_compensation_status NOT NULL DEFAULT 'pending',
  retry_count       INT NOT NULL DEFAULT 0,
  max_retries       INT NOT NULL DEFAULT 3,
  last_error        TEXT,
  scheduled_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_compensations_pending
  ON workflow_compensations(scheduled_at)
  WHERE status IN ('pending', 'failed');
CREATE INDEX idx_workflow_compensations_run
  ON workflow_compensations(run_id, created_at);

-- =============================================================================
-- AUDIT LOGS
-- =============================================================================
CREATE TABLE workflow_audit_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action            TEXT NOT NULL,
  entity_type       TEXT NOT NULL,
  entity_id         TEXT NOT NULL,
  before_state      JSONB,
  after_state       JSONB,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_audit_logs_tenant
  ON workflow_audit_logs(tenant_id, created_at DESC);

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_execution_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_compensations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_definitions_select_manager" ON workflow_definitions FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR is_manager_of(tenant_id));

CREATE POLICY "workflow_definitions_manage_admin" ON workflow_definitions FOR ALL TO authenticated
  USING (tenant_id IS NOT NULL AND is_manager_of(tenant_id))
  WITH CHECK (tenant_id IS NOT NULL AND is_manager_of(tenant_id));

CREATE POLICY "workflow_execution_history_select_manager" ON workflow_execution_history FOR SELECT TO authenticated
  USING (is_manager_of(tenant_id));

CREATE POLICY "workflow_compensations_select_manager" ON workflow_compensations FOR SELECT TO authenticated
  USING (is_manager_of(tenant_id));

CREATE POLICY "workflow_audit_logs_select_manager" ON workflow_audit_logs FOR SELECT TO authenticated
  USING (is_manager_of(tenant_id));

-- =============================================================================
-- OBSERVABILITY RPC
-- =============================================================================
CREATE OR REPLACE FUNCTION get_workflow_module_summary(p_tenant_id UUID)
RETURNS TABLE (
  total_runs BIGINT,
  running_runs BIGINT,
  failed_runs BIGINT,
  pending_jobs BIGINT,
  dead_letter_jobs BIGINT,
  pending_compensations BIGINT,
  avg_duration_ms NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM workflow_runs WHERE tenant_id = p_tenant_id),
    (SELECT COUNT(*) FROM workflow_runs WHERE tenant_id = p_tenant_id AND status IN ('pending', 'running', 'waiting_approval')),
    (SELECT COUNT(*) FROM workflow_runs WHERE tenant_id = p_tenant_id AND status = 'failed'),
    (SELECT COUNT(*) FROM workflow_jobs WHERE tenant_id = p_tenant_id AND status IN ('pending', 'failed')),
    (SELECT COUNT(*) FROM workflow_jobs WHERE tenant_id = p_tenant_id AND status = 'dead_letter'),
    (SELECT COUNT(*) FROM workflow_compensations WHERE tenant_id = p_tenant_id AND status IN ('pending', 'failed')),
    (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000), 0)
     FROM workflow_runs
     WHERE tenant_id = p_tenant_id AND completed_at IS NOT NULL AND started_at IS NOT NULL);
$$;

REVOKE ALL ON FUNCTION get_workflow_module_summary(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_workflow_module_summary(UUID) TO authenticated;

COMMENT ON TABLE workflow_definitions IS 'Reusable workflow definitions (built-in global + tenant custom)';
COMMENT ON TABLE workflow_execution_history IS 'Step-level workflow execution audit trail';
COMMENT ON TABLE workflow_compensations IS 'Saga compensation actions triggered on step failure';
COMMENT ON TABLE workflow_audit_logs IS 'Workflow module administrative audit trail';
