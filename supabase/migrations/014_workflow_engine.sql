-- Talent OS — Workflow Engine
-- Depends on: 005 (domain_events)
-- Triggers from domain_events → workflow_runs → workflow_jobs → actions / approvals

-- =============================================================================
-- ENUMS
-- =============================================================================
CREATE TYPE workflow_run_status AS ENUM (
  'pending', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled'
);

CREATE TYPE workflow_job_status AS ENUM (
  'pending', 'processing', 'completed', 'failed', 'dead_letter'
);

CREATE TYPE approval_status AS ENUM (
  'pending', 'approved', 'rejected', 'expired'
);

-- =============================================================================
-- WORKFLOW RUNS (one instance per triggered business process)
-- =============================================================================
CREATE TABLE workflow_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workflow_id       TEXT NOT NULL,
  trigger_event_id  UUID REFERENCES domain_events(id) ON DELETE SET NULL,
  trigger_event_type TEXT NOT NULL,
  status            workflow_run_status NOT NULL DEFAULT 'pending',
  context           JSONB NOT NULL DEFAULT '{}',
  current_step_id   TEXT,
  correlation_id    UUID NOT NULL DEFAULT gen_random_uuid(),
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  last_error        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, trigger_event_id, workflow_id)
);

CREATE INDEX idx_workflow_runs_tenant ON workflow_runs(tenant_id, created_at DESC);
CREATE INDEX idx_workflow_runs_status ON workflow_runs(status) WHERE status IN ('pending', 'running', 'waiting_approval');
CREATE INDEX idx_workflow_runs_trigger ON workflow_runs(trigger_event_id);

-- =============================================================================
-- WORKFLOW JOBS (background action queue with retries)
-- =============================================================================
CREATE TABLE workflow_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  run_id            UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  step_id           TEXT NOT NULL,
  queue_name        TEXT NOT NULL DEFAULT 'default',
  action_type       TEXT NOT NULL,
  config            JSONB NOT NULL DEFAULT '{}',
  status            workflow_job_status NOT NULL DEFAULT 'pending',
  retry_count       INTEGER NOT NULL DEFAULT 0,
  max_retries       INTEGER NOT NULL DEFAULT 5,
  last_error        TEXT,
  scheduled_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_jobs_pending ON workflow_jobs(scheduled_at)
  WHERE status IN ('pending', 'failed');
CREATE INDEX idx_workflow_jobs_run ON workflow_jobs(run_id, created_at);
CREATE INDEX idx_workflow_jobs_queue ON workflow_jobs(queue_name, status, scheduled_at);

-- =============================================================================
-- APPROVAL REQUESTS (human-in-the-loop gates)
-- =============================================================================
CREATE TABLE approval_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  run_id            UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  job_id            UUID NOT NULL REFERENCES workflow_jobs(id) ON DELETE CASCADE,
  approver_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approver_role     TEXT,
  status            approval_status NOT NULL DEFAULT 'pending',
  title             TEXT NOT NULL,
  body              TEXT,
  entity_type       TEXT,
  entity_id         UUID,
  metadata          JSONB NOT NULL DEFAULT '{}',
  expires_at        TIMESTAMPTZ,
  decided_at        TIMESTAMPTZ,
  decided_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  decision_note     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_approval_requests_pending ON approval_requests(tenant_id, approver_id)
  WHERE status = 'pending';
CREATE INDEX idx_approval_requests_run ON approval_requests(run_id);

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_runs_select_manager" ON workflow_runs FOR SELECT TO authenticated
  USING (is_manager_of(tenant_id));

CREATE POLICY "workflow_jobs_select_manager" ON workflow_jobs FOR SELECT TO authenticated
  USING (is_manager_of(tenant_id));

CREATE POLICY "approval_requests_select_own" ON approval_requests FOR SELECT TO authenticated
  USING (approver_id = auth.uid() OR is_manager_of(tenant_id));

CREATE POLICY "approval_requests_update_own" ON approval_requests FOR UPDATE TO authenticated
  USING (approver_id = auth.uid() AND status = 'pending')
  WITH CHECK (approver_id = auth.uid());

COMMENT ON TABLE workflow_runs IS 'Workflow process instances triggered by domain events';
COMMENT ON TABLE workflow_jobs IS 'Background job queue for workflow actions with retries';
COMMENT ON TABLE approval_requests IS 'Human approval gates within workflow runs';
