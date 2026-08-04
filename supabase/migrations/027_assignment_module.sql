-- Talent OS — Assignment Module (resource allocation)
-- Depends on: 001, 005, 025, 026
-- Adds allocations, capacity, schedules, requirements, conflicts, history, audit

-- =============================================================================
-- ENUMS
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE assignment_status AS ENUM ('planned', 'confirmed', 'active', 'completed', 'canceled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE assignment_conflict_type AS ENUM ('double_booking', 'over_allocation', 'availability_gap');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE assignment_conflict_severity AS ENUM ('warning', 'error');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- CAPACITY (freelancer workload limits)
-- =============================================================================
CREATE TABLE assignment_capacity (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  freelancer_id               UUID NOT NULL REFERENCES freelancers(id) ON DELETE CASCADE,
  weekly_hours                NUMERIC(5, 2) NOT NULL DEFAULT 40 CHECK (weekly_hours > 0),
  max_concurrent_assignments  INT NOT NULL DEFAULT 3 CHECK (max_concurrent_assignments > 0),
  effective_from              DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to                DATE,
  deleted_at                  TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assignment_capacity_freelancer ON assignment_capacity(freelancer_id, effective_from DESC)
  WHERE deleted_at IS NULL;

-- =============================================================================
-- ALLOCATIONS (core assignments)
-- =============================================================================
CREATE TABLE assignment_allocations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  freelancer_id     UUID NOT NULL REFERENCES freelancers(id) ON DELETE CASCADE,
  project_id        UUID REFERENCES projects(id) ON DELETE SET NULL,
  opportunity_id    UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  title             TEXT NOT NULL,
  status            assignment_status NOT NULL DEFAULT 'planned',
  allocation_pct    INT NOT NULL DEFAULT 100 CHECK (allocation_pct >= 0 AND allocation_pct <= 100),
  starts_at         TIMESTAMPTZ NOT NULL,
  ends_at           TIMESTAMPTZ NOT NULL,
  notes             TEXT,
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT assignment_allocation_range CHECK (ends_at > starts_at)
);

CREATE INDEX idx_assignment_allocations_tenant ON assignment_allocations(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_assignment_allocations_freelancer ON assignment_allocations(freelancer_id, starts_at, ends_at)
  WHERE deleted_at IS NULL AND status NOT IN ('completed', 'canceled');
CREATE INDEX idx_assignment_allocations_project ON assignment_allocations(project_id) WHERE deleted_at IS NULL;

-- =============================================================================
-- SCHEDULES (work blocks within an allocation)
-- =============================================================================
CREATE TABLE assignment_schedules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  allocation_id     UUID NOT NULL REFERENCES assignment_allocations(id) ON DELETE CASCADE,
  starts_at         TIMESTAMPTZ NOT NULL,
  ends_at           TIMESTAMPTZ NOT NULL,
  hours             NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (hours >= 0),
  notes             TEXT,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT assignment_schedule_range CHECK (ends_at > starts_at)
);

CREATE INDEX idx_assignment_schedules_allocation ON assignment_schedules(allocation_id, starts_at)
  WHERE deleted_at IS NULL;

-- =============================================================================
-- REQUIREMENTS (skills/hours needed for allocation)
-- =============================================================================
CREATE TABLE assignment_requirements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  allocation_id     UUID NOT NULL REFERENCES assignment_allocations(id) ON DELETE CASCADE,
  required_skills   TEXT[] NOT NULL DEFAULT '{}',
  min_hours         NUMERIC(5, 2),
  description       TEXT,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assignment_requirements_allocation ON assignment_requirements(allocation_id) WHERE deleted_at IS NULL;

-- =============================================================================
-- CONFLICTS (detected double-booking / over-allocation)
-- =============================================================================
CREATE TABLE assignment_conflicts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  freelancer_id     UUID NOT NULL REFERENCES freelancers(id) ON DELETE CASCADE,
  conflict_type     assignment_conflict_type NOT NULL,
  severity          assignment_conflict_severity NOT NULL DEFAULT 'warning',
  allocation_id_a   UUID NOT NULL REFERENCES assignment_allocations(id) ON DELETE CASCADE,
  allocation_id_b   UUID REFERENCES assignment_allocations(id) ON DELETE SET NULL,
  details           JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_at       TIMESTAMPTZ,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assignment_conflicts_freelancer ON assignment_conflicts(freelancer_id)
  WHERE deleted_at IS NULL AND resolved_at IS NULL;

-- =============================================================================
-- HISTORY (assignment change log)
-- =============================================================================
CREATE TABLE assignment_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  allocation_id     UUID NOT NULL REFERENCES assignment_allocations(id) ON DELETE CASCADE,
  action            TEXT NOT NULL,
  actor_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  before_state      JSONB,
  after_state       JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assignment_history_allocation ON assignment_history(allocation_id, created_at DESC);

-- =============================================================================
-- AUDIT LOGS
-- =============================================================================
CREATE TABLE assignment_audit_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action            TEXT NOT NULL,
  entity_type       TEXT NOT NULL,
  entity_id         UUID NOT NULL,
  before_state      JSONB,
  after_state       JSONB,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assignment_audit_tenant ON assignment_audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_assignment_audit_entity ON assignment_audit_logs(tenant_id, entity_type, entity_id);

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================
DROP TRIGGER IF EXISTS trg_assignment_capacity_updated ON assignment_capacity;
CREATE TRIGGER trg_assignment_capacity_updated
  BEFORE UPDATE ON assignment_capacity
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_assignment_allocations_updated ON assignment_allocations;
CREATE TRIGGER trg_assignment_allocations_updated
  BEFORE UPDATE ON assignment_allocations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_assignment_schedules_updated ON assignment_schedules;
CREATE TRIGGER trg_assignment_schedules_updated
  BEFORE UPDATE ON assignment_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_assignment_requirements_updated ON assignment_requirements;
CREATE TRIGGER trg_assignment_requirements_updated
  BEFORE UPDATE ON assignment_requirements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- CONFLICT DETECTION
-- =============================================================================
CREATE OR REPLACE FUNCTION public.detect_assignment_conflicts(
  p_tenant_id UUID,
  p_freelancer_id UUID,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_allocation_pct INT DEFAULT 100,
  p_exclude_allocation_id UUID DEFAULT NULL
)
RETURNS TABLE (
  conflict_type assignment_conflict_type,
  severity assignment_conflict_severity,
  conflicting_allocation_id UUID,
  overlapping_pct INT,
  message TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_pct INT := 0;
  v_max_concurrent INT := 3;
  v_weekly_hours NUMERIC := 40;
BEGIN
  SELECT COALESCE(ac.max_concurrent_assignments, 3), COALESCE(ac.weekly_hours, 40)
  INTO v_max_concurrent, v_weekly_hours
  FROM assignment_capacity ac
  WHERE ac.tenant_id = p_tenant_id
    AND ac.freelancer_id = p_freelancer_id
    AND ac.deleted_at IS NULL
    AND ac.effective_from <= CURRENT_DATE
    AND (ac.effective_to IS NULL OR ac.effective_to >= CURRENT_DATE)
  ORDER BY ac.effective_from DESC
  LIMIT 1;

  -- Double booking: overlapping time ranges
  RETURN QUERY
  SELECT
    'double_booking'::assignment_conflict_type,
    'error'::assignment_conflict_severity,
    a.id,
    a.allocation_pct,
    format('Overlaps with assignment "%s" (%s - %s)', a.title, a.starts_at, a.ends_at)
  FROM assignment_allocations a
  WHERE a.tenant_id = p_tenant_id
    AND a.freelancer_id = p_freelancer_id
    AND a.deleted_at IS NULL
    AND a.status NOT IN ('completed', 'canceled')
    AND (p_exclude_allocation_id IS NULL OR a.id != p_exclude_allocation_id)
    AND a.starts_at < p_ends_at
    AND a.ends_at > p_starts_at;

  -- Over-allocation: sum of allocation_pct in overlapping window
  SELECT COALESCE(SUM(a.allocation_pct), 0)::INT + p_allocation_pct
  INTO v_total_pct
  FROM assignment_allocations a
  WHERE a.tenant_id = p_tenant_id
    AND a.freelancer_id = p_freelancer_id
    AND a.deleted_at IS NULL
    AND a.status NOT IN ('completed', 'canceled')
    AND (p_exclude_allocation_id IS NULL OR a.id != p_exclude_allocation_id)
    AND a.starts_at < p_ends_at
    AND a.ends_at > p_starts_at;

  IF v_total_pct > 100 THEN
    RETURN QUERY SELECT
      'over_allocation'::assignment_conflict_type,
      'error'::assignment_conflict_severity,
      NULL::UUID,
      v_total_pct,
      format('Total allocation %s%% exceeds 100%% in this period', v_total_pct);
  ELSIF v_total_pct > 80 THEN
    RETURN QUERY SELECT
      'over_allocation'::assignment_conflict_type,
      'warning'::assignment_conflict_severity,
      NULL::UUID,
      v_total_pct,
      format('Total allocation %s%% is high in this period', v_total_pct);
  END IF;

  -- Concurrent assignment count
  IF (
    SELECT COUNT(*) FROM assignment_allocations a
    WHERE a.tenant_id = p_tenant_id
      AND a.freelancer_id = p_freelancer_id
      AND a.deleted_at IS NULL
      AND a.status NOT IN ('completed', 'canceled')
      AND (p_exclude_allocation_id IS NULL OR a.id != p_exclude_allocation_id)
      AND a.starts_at < p_ends_at
      AND a.ends_at > p_starts_at
  ) >= v_max_concurrent THEN
    RETURN QUERY SELECT
      'over_allocation'::assignment_conflict_type,
      'warning'::assignment_conflict_severity,
      NULL::UUID,
      v_max_concurrent,
      format('Freelancer has %s concurrent assignments (max %s)', v_max_concurrent, v_max_concurrent);
  END IF;

  -- Availability gap: no talent_availability_slots covering the period
  IF NOT EXISTS (
    SELECT 1 FROM talent_availability_slots s
    WHERE s.tenant_id = p_tenant_id
      AND s.freelancer_id = p_freelancer_id
      AND s.deleted_at IS NULL
      AND s.status IN ('available', 'busy')
      AND s.starts_at <= p_starts_at
      AND s.ends_at >= p_ends_at
  ) AND EXISTS (
    SELECT 1 FROM talent_availability_slots s
    WHERE s.tenant_id = p_tenant_id AND s.freelancer_id = p_freelancer_id AND s.deleted_at IS NULL
  ) THEN
    RETURN QUERY SELECT
      'availability_gap'::assignment_conflict_type,
      'warning'::assignment_conflict_severity,
      NULL::UUID,
      0,
      'No availability slot fully covers the requested period'::TEXT;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.detect_assignment_conflicts(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INT, UUID) TO authenticated;

-- =============================================================================
-- AUTOMATIC ASSIGNMENT SUGGESTIONS
-- =============================================================================
CREATE OR REPLACE FUNCTION public.suggest_assignment_candidates(
  p_tenant_id UUID,
  p_required_skills TEXT[] DEFAULT '{}',
  p_starts_at TIMESTAMPTZ DEFAULT NULL,
  p_ends_at TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  freelancer_id UUID,
  full_name TEXT,
  discipline TEXT,
  day_rate NUMERIC,
  internal_rating NUMERIC,
  skill_match_count INT,
  current_allocation_pct INT,
  availability TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id,
    f.full_name,
    f.discipline::TEXT,
    f.day_rate,
    f.internal_rating,
    (
      SELECT COUNT(*)::INT FROM unnest(p_required_skills) req
      WHERE EXISTS (SELECT 1 FROM unnest(f.skills) fs WHERE lower(fs) = lower(req))
    ) AS skill_match_count,
    COALESCE((
      SELECT SUM(a.allocation_pct)::INT FROM assignment_allocations a
      WHERE a.freelancer_id = f.id
        AND a.tenant_id = p_tenant_id
        AND a.deleted_at IS NULL
        AND a.status NOT IN ('completed', 'canceled')
        AND (p_starts_at IS NULL OR a.starts_at < COALESCE(p_ends_at, a.ends_at))
        AND (p_ends_at IS NULL OR a.ends_at > COALESCE(p_starts_at, a.starts_at))
    ), 0) AS current_allocation_pct,
    f.availability::TEXT
  FROM freelancers f
  WHERE f.tenant_id = p_tenant_id
    AND f.deleted_at IS NULL
    AND f.availability IN ('available', 'busy')
  ORDER BY skill_match_count DESC, current_allocation_pct ASC, f.internal_rating DESC NULLS LAST
  LIMIT COALESCE(p_limit, 10);
$$;

GRANT EXECUTE ON FUNCTION public.suggest_assignment_candidates(UUID, TEXT[], TIMESTAMPTZ, TIMESTAMPTZ, INT) TO authenticated;

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE assignment_capacity ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignment_capacity_select" ON assignment_capacity FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "assignment_capacity_manage" ON assignment_capacity FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "assignment_allocations_select" ON assignment_allocations FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "assignment_allocations_manage" ON assignment_allocations FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "assignment_allocations_self" ON assignment_allocations FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND
    freelancer_id IN (SELECT id FROM freelancers WHERE user_id = auth.uid())
  );

CREATE POLICY "assignment_schedules_select" ON assignment_schedules FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "assignment_schedules_manage" ON assignment_schedules FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "assignment_requirements_select" ON assignment_requirements FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "assignment_requirements_manage" ON assignment_requirements FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "assignment_conflicts_select" ON assignment_conflicts FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "assignment_conflicts_manage" ON assignment_conflicts FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "assignment_history_select" ON assignment_history FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "assignment_history_insert" ON assignment_history FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "assignment_audit_select" ON assignment_audit_logs FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "assignment_audit_insert" ON assignment_audit_logs FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

COMMENT ON TABLE assignment_allocations IS 'Talent-to-project/opportunity resource allocations';
COMMENT ON TABLE assignment_capacity IS 'Freelancer workload capacity limits';
COMMENT ON TABLE assignment_schedules IS 'Scheduled work blocks within allocations';
COMMENT ON TABLE assignment_conflicts IS 'Detected scheduling conflicts and over-allocation alerts';
COMMENT ON TABLE assignment_history IS 'Assignment change history per allocation';
COMMENT ON TABLE assignment_audit_logs IS 'Immutable assignment module audit trail';
