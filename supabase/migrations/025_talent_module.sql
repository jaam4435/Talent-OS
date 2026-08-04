-- Talent OS — Talent Module (supply management)
-- Depends on: 001, 009, 023, 024
-- Extends freelancers; adds experience, documents, availability calendar, import batches, audit

-- =============================================================================
-- ENUMS
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE talent_employment_type AS ENUM ('freelance', 'contract', 'part_time', 'full_time');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE talent_document_type AS ENUM ('cv', 'certificate', 'reference', 'portfolio', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE talent_slot_status AS ENUM ('available', 'busy', 'unavailable', 'booked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE talent_import_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- EXTEND FREELANCERS
-- =============================================================================
ALTER TABLE freelancers
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS timezone TEXT,
  ADD COLUMN IF NOT EXISTS employment_type talent_employment_type NOT NULL DEFAULT 'freelance',
  ADD COLUMN IF NOT EXISTS languages JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS profile_completeness INT NOT NULL DEFAULT 0
    CHECK (profile_completeness >= 0 AND profile_completeness <= 100),
  ADD COLUMN IF NOT EXISTS cv_file_path TEXT;

CREATE INDEX IF NOT EXISTS idx_freelancers_active ON freelancers(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_freelancers_employment ON freelancers(tenant_id, employment_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_freelancers_completeness ON freelancers(tenant_id, profile_completeness DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_freelancers_languages ON freelancers USING gin(languages);

-- =============================================================================
-- EXPERIENCE
-- =============================================================================
CREATE TABLE talent_experience (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  freelancer_id   UUID NOT NULL REFERENCES freelancers(id) ON DELETE CASCADE,
  company         TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  starts_on       DATE NOT NULL,
  ends_on         DATE,
  skills          TEXT[] NOT NULL DEFAULT '{}',
  sort_order      INT NOT NULL DEFAULT 0,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_talent_experience_freelancer ON talent_experience(freelancer_id, sort_order)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_talent_experience_tenant ON talent_experience(tenant_id) WHERE deleted_at IS NULL;

-- =============================================================================
-- DOCUMENTS (CV, certificates, etc.)
-- =============================================================================
CREATE TABLE talent_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  freelancer_id   UUID NOT NULL REFERENCES freelancers(id) ON DELETE CASCADE,
  doc_type        talent_document_type NOT NULL DEFAULT 'other',
  file_name       TEXT NOT NULL,
  file_path       TEXT NOT NULL,
  mime_type       TEXT,
  size_bytes      BIGINT,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_talent_documents_freelancer ON talent_documents(freelancer_id, doc_type)
  WHERE deleted_at IS NULL;

-- =============================================================================
-- AVAILABILITY CALENDAR SLOTS
-- =============================================================================
CREATE TABLE talent_availability_slots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  freelancer_id   UUID NOT NULL REFERENCES freelancers(id) ON DELETE CASCADE,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  status          talent_slot_status NOT NULL DEFAULT 'available',
  notes           TEXT,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT talent_availability_slot_range CHECK (ends_at > starts_at)
);

CREATE INDEX idx_talent_availability_freelancer ON talent_availability_slots(freelancer_id, starts_at)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_talent_availability_range ON talent_availability_slots(tenant_id, starts_at, ends_at)
  WHERE deleted_at IS NULL;

-- =============================================================================
-- BULK / CSV IMPORT BATCHES
-- =============================================================================
CREATE TABLE talent_import_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  uploaded_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  file_name       TEXT NOT NULL,
  status          talent_import_status NOT NULL DEFAULT 'pending',
  total_rows      INT NOT NULL DEFAULT 0,
  success_count   INT NOT NULL DEFAULT 0,
  error_count     INT NOT NULL DEFAULT 0,
  errors          JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_talent_import_batches_tenant ON talent_import_batches(tenant_id, created_at DESC);

-- =============================================================================
-- AUDIT LOGS
-- =============================================================================
CREATE TABLE talent_audit_logs (
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

CREATE INDEX idx_talent_audit_tenant ON talent_audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_talent_audit_entity ON talent_audit_logs(tenant_id, entity_type, entity_id);
CREATE INDEX idx_talent_audit_action ON talent_audit_logs(tenant_id, action);

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================
DROP TRIGGER IF EXISTS trg_talent_experience_updated ON talent_experience;
CREATE TRIGGER trg_talent_experience_updated
  BEFORE UPDATE ON talent_experience
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_talent_documents_updated ON talent_documents;
CREATE TRIGGER trg_talent_documents_updated
  BEFORE UPDATE ON talent_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_talent_availability_updated ON talent_availability_slots;
CREATE TRIGGER trg_talent_availability_updated
  BEFORE UPDATE ON talent_availability_slots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- ADVANCED SEARCH (extends search_freelancers filters)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.search_talent_advanced(
  p_tenant_id UUID,
  p_query TEXT DEFAULT NULL,
  p_discipline discipline_type DEFAULT NULL,
  p_availability availability_status DEFAULT NULL,
  p_min_rate NUMERIC DEFAULT NULL,
  p_max_rate NUMERIC DEFAULT NULL,
  p_min_rating NUMERIC DEFAULT NULL,
  p_skills TEXT[] DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_employment_type talent_employment_type DEFAULT NULL,
  p_timezone TEXT DEFAULT NULL,
  p_min_completeness INT DEFAULT NULL,
  p_sort TEXT DEFAULT 'rating',
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS SETOF freelancers
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT f.*
  FROM freelancers f
  WHERE f.tenant_id = p_tenant_id
    AND f.deleted_at IS NULL
    AND (p_discipline IS NULL OR f.discipline = p_discipline)
    AND (p_availability IS NULL OR f.availability = p_availability)
    AND (p_min_rate IS NULL OR f.day_rate >= p_min_rate)
    AND (p_max_rate IS NULL OR f.day_rate <= p_max_rate)
    AND (p_min_rating IS NULL OR f.internal_rating >= p_min_rating)
    AND (p_employment_type IS NULL OR f.employment_type = p_employment_type)
    AND (p_timezone IS NULL OR f.timezone = p_timezone)
    AND (p_min_completeness IS NULL OR f.profile_completeness >= p_min_completeness)
    AND (p_skills IS NULL OR f.skills @> p_skills)
    AND (p_tags IS NULL OR f.tags && p_tags)
    AND (
      p_query IS NULL OR p_query = '' OR
      f.full_name ILIKE '%' || p_query || '%' OR
      f.email ILIKE '%' || p_query || '%' OR
      f.bio ILIKE '%' || p_query || '%' OR
      EXISTS (SELECT 1 FROM unnest(f.skills) s WHERE s ILIKE '%' || p_query || '%')
    )
  ORDER BY
    CASE WHEN p_sort = 'name' THEN f.full_name END ASC,
    CASE WHEN p_sort = 'rate_asc' THEN f.day_rate END ASC NULLS LAST,
    CASE WHEN p_sort = 'rate_desc' THEN f.day_rate END DESC NULLS LAST,
    CASE WHEN p_sort = 'completeness' THEN f.profile_completeness END DESC,
    CASE WHEN p_sort = 'active' THEN f.last_active_at END DESC NULLS LAST,
    CASE WHEN p_sort = 'rating' OR p_sort IS NULL THEN f.internal_rating END DESC NULLS LAST,
    f.created_at DESC
  LIMIT COALESCE(p_limit, 20)
  OFFSET COALESCE(p_offset, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_talent_advanced(
  UUID, TEXT, discipline_type, availability_status, NUMERIC, NUMERIC, NUMERIC,
  TEXT[], TEXT[], talent_employment_type, TEXT, INT, TEXT, INT, INT
) TO authenticated;

-- =============================================================================
-- SKILL MATCHING
-- =============================================================================
CREATE OR REPLACE FUNCTION public.match_talent_skills(
  p_tenant_id UUID,
  p_required_skills TEXT[],
  p_discipline discipline_type DEFAULT NULL,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  freelancer_id UUID,
  full_name TEXT,
  discipline discipline_type,
  day_rate NUMERIC,
  internal_rating NUMERIC,
  skill_match_count INT,
  match_ratio NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id,
    f.full_name,
    f.discipline,
    f.day_rate,
    f.internal_rating,
    (
      SELECT COUNT(*)::INT
      FROM unnest(p_required_skills) req
      WHERE EXISTS (
        SELECT 1 FROM unnest(f.skills) fs WHERE lower(fs) = lower(req)
      )
    ) AS skill_match_count,
    CASE
      WHEN cardinality(p_required_skills) = 0 THEN 0
      ELSE (
        SELECT COUNT(*)::NUMERIC / cardinality(p_required_skills)
        FROM unnest(p_required_skills) req
        WHERE EXISTS (
          SELECT 1 FROM unnest(f.skills) fs WHERE lower(fs) = lower(req)
        )
      )
    END AS match_ratio
  FROM freelancers f
  WHERE f.tenant_id = p_tenant_id
    AND f.deleted_at IS NULL
    AND f.availability IN ('available', 'busy')
    AND (p_discipline IS NULL OR f.discipline = p_discipline)
  ORDER BY skill_match_count DESC, f.internal_rating DESC NULLS LAST, f.full_name
  LIMIT COALESCE(p_limit, 20);
$$;

GRANT EXECUTE ON FUNCTION public.match_talent_skills(UUID, TEXT[], discipline_type, INT) TO authenticated;

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE talent_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_audit_logs ENABLE ROW LEVEL SECURITY;

-- Experience
CREATE POLICY "talent_experience_select" ON talent_experience FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "talent_experience_manage" ON talent_experience FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "talent_experience_self" ON talent_experience FOR ALL TO authenticated
  USING (
    deleted_at IS NULL AND
    freelancer_id IN (SELECT id FROM freelancers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    freelancer_id IN (SELECT id FROM freelancers WHERE user_id = auth.uid())
  );

-- Documents
CREATE POLICY "talent_documents_select" ON talent_documents FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "talent_documents_manage" ON talent_documents FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "talent_documents_self" ON talent_documents FOR ALL TO authenticated
  USING (
    deleted_at IS NULL AND
    freelancer_id IN (SELECT id FROM freelancers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    freelancer_id IN (SELECT id FROM freelancers WHERE user_id = auth.uid())
  );

-- Availability slots
CREATE POLICY "talent_availability_select" ON talent_availability_slots FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "talent_availability_manage" ON talent_availability_slots FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "talent_availability_self" ON talent_availability_slots FOR ALL TO authenticated
  USING (
    deleted_at IS NULL AND
    freelancer_id IN (SELECT id FROM freelancers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    freelancer_id IN (SELECT id FROM freelancers WHERE user_id = auth.uid())
  );

-- Import batches (managers only)
CREATE POLICY "talent_import_select" ON talent_import_batches FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "talent_import_manage" ON talent_import_batches FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

-- Audit logs
CREATE POLICY "talent_audit_select" ON talent_audit_logs FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "talent_audit_insert" ON talent_audit_logs FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

COMMENT ON TABLE talent_experience IS 'Work history entries for talent profiles';
COMMENT ON TABLE talent_documents IS 'CV and supporting documents for talent profiles';
COMMENT ON TABLE talent_availability_slots IS 'Calendar availability windows for talent scheduling';
COMMENT ON TABLE talent_import_batches IS 'Bulk/CSV import job tracking';
COMMENT ON TABLE talent_audit_logs IS 'Immutable talent module audit trail';
