-- Sprint 3: Talent system — portfolio items, rating history, profile audit

CREATE TABLE IF NOT EXISTS freelancer_portfolio_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  freelancer_id   UUID NOT NULL REFERENCES freelancers(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  project_url     TEXT,
  image_path      TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_items_freelancer
  ON freelancer_portfolio_items(freelancer_id, sort_order);

CREATE TABLE IF NOT EXISTS freelancer_rating_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  freelancer_id   UUID NOT NULL REFERENCES freelancers(id) ON DELETE CASCADE,
  rated_by        UUID NOT NULL REFERENCES profiles(id),
  rating          NUMERIC(2, 1) NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rating_history_freelancer
  ON freelancer_rating_history(freelancer_id, created_at DESC);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolio',
  'portfolio',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.enforce_portfolio_item_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant UUID;
BEGIN
  SELECT tenant_id INTO v_tenant FROM freelancers WHERE id = NEW.freelancer_id;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Freelancer not found';
  END IF;
  NEW.tenant_id := v_tenant;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_portfolio_item_tenant ON freelancer_portfolio_items;
CREATE TRIGGER trg_portfolio_item_tenant
  BEFORE INSERT OR UPDATE ON freelancer_portfolio_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_portfolio_item_tenant();

CREATE OR REPLACE FUNCTION public.handle_freelancer_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.internal_rating IS DISTINCT FROM NEW.internal_rating AND NEW.internal_rating IS NOT NULL THEN
      INSERT INTO freelancer_rating_history (tenant_id, freelancer_id, rated_by, rating, note)
      VALUES (NEW.tenant_id, NEW.id, auth.uid(), NEW.internal_rating, NEW.internal_notes);
    END IF;

    IF OLD.bio IS DISTINCT FROM NEW.bio
       OR OLD.skills IS DISTINCT FROM NEW.skills
       OR OLD.portfolio_url IS DISTINCT FROM NEW.portfolio_url
       OR OLD.availability IS DISTINCT FROM NEW.availability
       OR OLD.tags IS DISTINCT FROM NEW.tags THEN
      PERFORM log_activity(
        NEW.tenant_id,
        auth.uid(),
        'freelancer',
        NEW.id,
        'profile_updated',
        jsonb_build_object(
          'fields', jsonb_strip_nulls(jsonb_build_object(
            'bio', CASE WHEN OLD.bio IS DISTINCT FROM NEW.bio THEN true END,
            'skills', CASE WHEN OLD.skills IS DISTINCT FROM NEW.skills THEN true END,
            'portfolio_url', CASE WHEN OLD.portfolio_url IS DISTINCT FROM NEW.portfolio_url THEN true END,
            'availability', CASE WHEN OLD.availability IS DISTINCT FROM NEW.availability THEN true END,
            'tags', CASE WHEN OLD.tags IS DISTINCT FROM NEW.tags THEN true END
          ))
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_freelancer_profile_update ON freelancers;
CREATE TRIGGER trg_freelancer_profile_update
  AFTER UPDATE ON freelancers
  FOR EACH ROW EXECUTE FUNCTION public.handle_freelancer_profile_update();

CREATE OR REPLACE FUNCTION public.search_freelancers(
  p_tenant_id UUID,
  p_query TEXT DEFAULT NULL,
  p_discipline discipline_type DEFAULT NULL,
  p_availability availability_status DEFAULT NULL,
  p_min_rate NUMERIC DEFAULT NULL,
  p_max_rate NUMERIC DEFAULT NULL,
  p_min_rating NUMERIC DEFAULT NULL,
  p_sort TEXT DEFAULT 'rating',
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF freelancers
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM freelancers f
  WHERE f.tenant_id = p_tenant_id
    AND (
      public.is_manager_of(p_tenant_id)
      OR f.user_id = auth.uid()
    )
    AND (p_query IS NULL OR p_query = '' OR (
      f.full_name ILIKE '%' || p_query || '%'
      OR f.email ILIKE '%' || p_query || '%'
      OR f.bio ILIKE '%' || p_query || '%'
      OR EXISTS (SELECT 1 FROM unnest(f.skills) s(skill) WHERE s.skill ILIKE '%' || p_query || '%')
      OR EXISTS (SELECT 1 FROM unnest(f.tags) t(tag) WHERE t.tag ILIKE '%' || p_query || '%')
    ))
    AND (p_discipline IS NULL OR f.discipline = p_discipline)
    AND (p_availability IS NULL OR f.availability = p_availability)
    AND (p_min_rate IS NULL OR f.day_rate >= p_min_rate)
    AND (p_max_rate IS NULL OR f.day_rate <= p_max_rate)
    AND (p_min_rating IS NULL OR f.internal_rating >= p_min_rating)
  ORDER BY
    CASE WHEN p_sort = 'name' THEN f.full_name END ASC,
    CASE WHEN p_sort = 'rate_asc' THEN f.day_rate END ASC NULLS LAST,
    CASE WHEN p_sort = 'rate_desc' THEN f.day_rate END DESC NULLS LAST,
    CASE WHEN p_sort = 'active' THEN f.last_active_at END DESC NULLS LAST,
    f.internal_rating DESC NULLS LAST,
    f.full_name ASC
  LIMIT p_limit OFFSET p_offset;
$$;

ALTER TABLE freelancer_portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE freelancer_rating_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolio_select_manager" ON freelancer_portfolio_items FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "portfolio_select_own" ON freelancer_portfolio_items FOR SELECT TO authenticated
  USING (freelancer_id IN (SELECT public.user_freelancer_ids()));

CREATE POLICY "portfolio_insert" ON freelancer_portfolio_items FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT public.manager_tenant_ids())
    OR freelancer_id IN (SELECT public.user_freelancer_ids())
  );

CREATE POLICY "portfolio_update" ON freelancer_portfolio_items FOR UPDATE TO authenticated
  USING (
    tenant_id IN (SELECT public.manager_tenant_ids())
    OR freelancer_id IN (SELECT public.user_freelancer_ids())
  )
  WITH CHECK (
    tenant_id IN (SELECT public.manager_tenant_ids())
    OR freelancer_id IN (SELECT public.user_freelancer_ids())
  );

CREATE POLICY "portfolio_delete" ON freelancer_portfolio_items FOR DELETE TO authenticated
  USING (
    tenant_id IN (SELECT public.manager_tenant_ids())
    OR freelancer_id IN (SELECT public.user_freelancer_ids())
  );

CREATE POLICY "rating_history_select_manager" ON freelancer_rating_history FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "rating_history_insert_manager" ON freelancer_rating_history FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.manager_tenant_ids()));

CREATE POLICY "portfolio_storage_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'portfolio');

CREATE POLICY "portfolio_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'portfolio'
    AND (
      (storage.foldername(name))[1]::uuid IN (SELECT public.manager_tenant_ids())
      OR (storage.foldername(name))[2]::uuid IN (SELECT public.user_freelancer_ids())
    )
  );

CREATE POLICY "portfolio_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'portfolio'
    AND (
      (storage.foldername(name))[1]::uuid IN (SELECT public.manager_tenant_ids())
      OR (storage.foldername(name))[2]::uuid IN (SELECT public.user_freelancer_ids())
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON freelancer_portfolio_items TO authenticated;
GRANT SELECT, INSERT ON freelancer_rating_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_freelancers(UUID, TEXT, discipline_type, availability_status, NUMERIC, NUMERIC, NUMERIC, TEXT, INTEGER, INTEGER) TO authenticated;
