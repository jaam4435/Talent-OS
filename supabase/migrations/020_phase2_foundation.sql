-- Phase 2: Platform Foundation — indexes, integration hardening, RPC guards

-- =============================================================================
-- 1. Domain events dispatch index (WF-01)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_domain_events_status_scheduled
  ON domain_events (status, scheduled_at)
  WHERE status IN ('pending', 'failed');

-- =============================================================================
-- 2. WhatsApp phone_number_id indexed lookup (INT-03, WA-04)
-- =============================================================================
ALTER TABLE integration_configs
  ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT;

CREATE INDEX IF NOT EXISTS idx_integration_configs_whatsapp_phone
  ON integration_configs (whatsapp_phone_number_id)
  WHERE provider = 'whatsapp' AND is_active = true AND whatsapp_phone_number_id IS NOT NULL;

UPDATE integration_configs
SET whatsapp_phone_number_id = config->>'phone_number_id'
WHERE provider = 'whatsapp'
  AND whatsapp_phone_number_id IS NULL
  AND config ? 'phone_number_id';

-- =============================================================================
-- 3. Webhook delivery purge support index (INT-04)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at
  ON webhook_deliveries (created_at);

-- =============================================================================
-- 4. Tenant membership helper for SECURITY DEFINER RPCs (TAL-03, KB-04)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_member_of(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tenant_members tm
    WHERE tm.tenant_id = p_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_member_of(UUID) TO authenticated;

-- =============================================================================
-- 5. search_freelancers — require tenant membership (TAL-03)
-- =============================================================================
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
    AND public.is_member_of(p_tenant_id)
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

-- =============================================================================
-- 6. search_knowledge_entries — require tenant membership (KB-04)
-- =============================================================================
CREATE OR REPLACE FUNCTION search_knowledge_entries(
  p_tenant_id UUID,
  p_query TEXT,
  p_categories knowledge_category[] DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  category knowledge_category,
  title TEXT,
  summary TEXT,
  content TEXT,
  entity_type TEXT,
  entity_id UUID,
  rank REAL
) AS $$
BEGIN
  IF NOT public.is_member_of(p_tenant_id) THEN
    RAISE EXCEPTION 'Not a member of tenant';
  END IF;

  RETURN QUERY
  SELECT
    ke.id,
    ke.category,
    ke.title,
    ke.summary,
    left(ke.content, 500) AS content,
    ke.entity_type,
    ke.entity_id,
    ts_rank(ke.search_vector, websearch_to_tsquery('english', p_query)) AS rank
  FROM knowledge_entries ke
  WHERE ke.tenant_id = p_tenant_id
    AND ke.search_vector @@ websearch_to_tsquery('english', p_query)
    AND (p_categories IS NULL OR ke.category = ANY(p_categories))
    AND (p_entity_type IS NULL OR ke.entity_type = p_entity_type)
    AND (p_entity_id IS NULL OR ke.entity_id = p_entity_id)
  ORDER BY rank DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
