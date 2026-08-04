-- Talent OS — Project Module (delivery management)
-- Depends on: 001, 010, 012, 025
-- Extends projects/milestones; adds tasks, deliverables, assets, comments, dependencies, templates, timeline, audit

-- =============================================================================
-- ENUMS
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE project_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE project_health_status AS ENUM ('on_track', 'at_risk', 'blocked', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE project_task_status AS ENUM ('todo', 'in_progress', 'done', 'blocked', 'canceled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE project_deliverable_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE project_asset_type AS ENUM ('file', 'link', 'image', 'document');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE project_dependency_entity AS ENUM ('project', 'milestone', 'task', 'deliverable');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE project_timeline_event_type AS ENUM (
    'status_change', 'milestone_completed', 'task_completed',
    'deliverable_submitted', 'comment', 'deadline', 'health_change', 'dependency_added'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- EXTEND PROJECTS
-- =============================================================================
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS priority project_priority NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS deadline DATE,
  ADD COLUMN IF NOT EXISTS template_id UUID,
  ADD COLUMN IF NOT EXISTS health_score INT NOT NULL DEFAULT 100
    CHECK (health_score >= 0 AND health_score <= 100),
  ADD COLUMN IF NOT EXISTS health_status project_health_status NOT NULL DEFAULT 'on_track',
  ADD COLUMN IF NOT EXISTS ai_context JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(tenant_id, priority) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_deadline ON projects(deadline) WHERE deleted_at IS NULL AND status NOT IN ('completed', 'archived', 'canceled');
CREATE INDEX IF NOT EXISTS idx_projects_health ON projects(tenant_id, health_status) WHERE deleted_at IS NULL;

-- =============================================================================
-- EXTEND MILESTONES
-- =============================================================================
ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS priority project_priority NOT NULL DEFAULT 'medium';

CREATE INDEX IF NOT EXISTS idx_milestones_active ON milestones(project_id, sort_order) WHERE deleted_at IS NULL;

-- =============================================================================
-- PROJECT TEMPLATES
-- =============================================================================
CREATE TABLE project_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  default_milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_tasks     JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT project_templates_name_unique UNIQUE (tenant_id, name)
);

CREATE INDEX idx_project_templates_tenant ON project_templates(tenant_id) WHERE deleted_at IS NULL AND is_active = true;

ALTER TABLE projects
  ADD CONSTRAINT projects_template_fk
  FOREIGN KEY (template_id) REFERENCES project_templates(id) ON DELETE SET NULL;

-- =============================================================================
-- PROJECT TASKS (distinct from payment milestones)
-- =============================================================================
CREATE TABLE project_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id    UUID REFERENCES milestones(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  status          project_task_status NOT NULL DEFAULT 'todo',
  priority        project_priority NOT NULL DEFAULT 'medium',
  assignee_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  due_date        DATE,
  sort_order      INT NOT NULL DEFAULT 0,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_tasks_project ON project_tasks(project_id, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_tasks_assignee ON project_tasks(assignee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_tasks_due ON project_tasks(due_date) WHERE deleted_at IS NULL AND status NOT IN ('done', 'canceled');

-- =============================================================================
-- DELIVERABLES
-- =============================================================================
CREATE TABLE project_deliverables (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id    UUID REFERENCES milestones(id) ON DELETE SET NULL,
  task_id         UUID REFERENCES project_tasks(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  status          project_deliverable_status NOT NULL DEFAULT 'draft',
  file_path       TEXT,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_deliverables_project ON project_deliverables(project_id) WHERE deleted_at IS NULL;

-- =============================================================================
-- ASSETS / FILES
-- =============================================================================
CREATE TABLE project_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  asset_type      project_asset_type NOT NULL DEFAULT 'file',
  name            TEXT NOT NULL,
  file_path       TEXT,
  url             TEXT,
  mime_type       TEXT,
  size_bytes      BIGINT,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_assets_project ON project_assets(project_id, asset_type) WHERE deleted_at IS NULL;

-- =============================================================================
-- COMMENTS
-- =============================================================================
CREATE TABLE project_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entity_type     TEXT NOT NULL DEFAULT 'project',
  entity_id       UUID NOT NULL,
  author_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  body            TEXT NOT NULL,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_comments_project ON project_comments(project_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_comments_entity ON project_comments(entity_type, entity_id) WHERE deleted_at IS NULL;

-- =============================================================================
-- DEPENDENCIES
-- =============================================================================
CREATE TABLE project_dependencies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  predecessor_type    project_dependency_entity NOT NULL,
  predecessor_id      UUID NOT NULL,
  successor_type      project_dependency_entity NOT NULL,
  successor_id        UUID NOT NULL,
  notes               TEXT,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT project_dependencies_unique UNIQUE (project_id, predecessor_type, predecessor_id, successor_type, successor_id)
);

CREATE INDEX idx_project_dependencies_project ON project_dependencies(project_id) WHERE deleted_at IS NULL;

-- =============================================================================
-- TIMELINE
-- =============================================================================
CREATE TABLE project_timeline_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  event_type      project_timeline_event_type NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  actor_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_timeline_project ON project_timeline_events(project_id, occurred_at DESC);

-- =============================================================================
-- AUDIT LOGS
-- =============================================================================
CREATE TABLE project_audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  before_state    JSONB,
  after_state     JSONB,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_audit_tenant ON project_audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_project_audit_entity ON project_audit_logs(tenant_id, entity_type, entity_id);

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================
DROP TRIGGER IF EXISTS trg_project_templates_updated ON project_templates;
CREATE TRIGGER trg_project_templates_updated
  BEFORE UPDATE ON project_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_project_tasks_updated ON project_tasks;
CREATE TRIGGER trg_project_tasks_updated
  BEFORE UPDATE ON project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_project_deliverables_updated ON project_deliverables;
CREATE TRIGGER trg_project_deliverables_updated
  BEFORE UPDATE ON project_deliverables
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_project_assets_updated ON project_assets;
CREATE TRIGGER trg_project_assets_updated
  BEFORE UPDATE ON project_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_project_comments_updated ON project_comments;
CREATE TRIGGER trg_project_comments_updated
  BEFORE UPDATE ON project_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- PROJECT HEALTH FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION public.compute_project_health(p_project_id UUID)
RETURNS TABLE (
  health_score INT,
  health_status project_health_status,
  overdue_milestones INT,
  overdue_tasks INT,
  blocked_tasks INT,
  open_deliverables INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score INT := 100;
  v_status project_health_status := 'on_track';
  v_overdue_m INT := 0;
  v_overdue_t INT := 0;
  v_blocked INT := 0;
  v_open_del INT := 0;
BEGIN
  SELECT COUNT(*)::INT INTO v_overdue_m
  FROM milestones m
  WHERE m.project_id = p_project_id
    AND m.deleted_at IS NULL
    AND m.due_date < CURRENT_DATE
    AND m.status NOT IN ('approved', 'canceled');

  SELECT COUNT(*)::INT INTO v_overdue_t
  FROM project_tasks t
  WHERE t.project_id = p_project_id
    AND t.deleted_at IS NULL
    AND t.due_date < CURRENT_DATE
    AND t.status NOT IN ('done', 'canceled');

  SELECT COUNT(*)::INT INTO v_blocked
  FROM project_tasks t
  WHERE t.project_id = p_project_id
    AND t.deleted_at IS NULL
    AND t.status = 'blocked';

  SELECT COUNT(*)::INT INTO v_open_del
  FROM project_deliverables d
  WHERE d.project_id = p_project_id
    AND d.deleted_at IS NULL
    AND d.status NOT IN ('approved');

  v_score := GREATEST(0, 100 - (v_overdue_m * 15) - (v_overdue_t * 10) - (v_blocked * 20) - (v_open_del * 5));

  IF v_blocked > 0 THEN
    v_status := 'blocked';
  ELSIF v_overdue_m > 0 OR v_overdue_t > 0 THEN
    v_status := 'at_risk';
  ELSIF v_score >= 80 THEN
    v_status := 'on_track';
  ELSE
    v_status := 'at_risk';
  END IF;

  RETURN QUERY SELECT v_score, v_status, v_overdue_m, v_overdue_t, v_blocked, v_open_del;
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_project_health(UUID) TO authenticated;

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_audit_logs ENABLE ROW LEVEL SECURITY;

-- Templates (managers)
CREATE POLICY "project_templates_select" ON project_templates FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "project_templates_manage" ON project_templates FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

-- Tasks
CREATE POLICY "project_tasks_select" ON project_tasks FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "project_tasks_manage" ON project_tasks FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "project_tasks_freelancer" ON project_tasks FOR ALL TO authenticated
  USING (
    deleted_at IS NULL AND
    project_id IN (
      SELECT p.id FROM projects p
      JOIN freelancers f ON f.id = p.freelancer_id
      WHERE f.user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN freelancers f ON f.id = p.freelancer_id
      WHERE f.user_id = auth.uid()
    )
  );

-- Deliverables
CREATE POLICY "project_deliverables_select" ON project_deliverables FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "project_deliverables_manage" ON project_deliverables FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "project_deliverables_freelancer" ON project_deliverables FOR ALL TO authenticated
  USING (
    deleted_at IS NULL AND
    project_id IN (
      SELECT p.id FROM projects p
      JOIN freelancers f ON f.id = p.freelancer_id
      WHERE f.user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN freelancers f ON f.id = p.freelancer_id
      WHERE f.user_id = auth.uid()
    )
  );

-- Assets
CREATE POLICY "project_assets_select" ON project_assets FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "project_assets_manage" ON project_assets FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));

-- Comments
CREATE POLICY "project_comments_select" ON project_comments FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "project_comments_insert" ON project_comments FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "project_comments_update" ON project_comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR tenant_id IN (SELECT public.manager_tenant_ids()));

-- Dependencies
CREATE POLICY "project_dependencies_select" ON project_dependencies FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "project_dependencies_manage" ON project_dependencies FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

-- Timeline
CREATE POLICY "project_timeline_select" ON project_timeline_events FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "project_timeline_insert" ON project_timeline_events FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));

-- Audit
CREATE POLICY "project_audit_select" ON project_audit_logs FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "project_audit_insert" ON project_audit_logs FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

COMMENT ON TABLE project_tasks IS 'Actionable work items within a project (distinct from payment milestones)';
COMMENT ON TABLE project_deliverables IS 'Client-facing deliverables linked to milestones or tasks';
COMMENT ON TABLE project_assets IS 'Project files, links, and media assets';
COMMENT ON TABLE project_templates IS 'Reusable project kickoff templates';
COMMENT ON TABLE project_timeline_events IS 'Chronological project activity feed';
COMMENT ON TABLE project_audit_logs IS 'Immutable project module audit trail';
