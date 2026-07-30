-- Talent OS — Organization Knowledge
-- Extends knowledge module with org-knowledge categories, source indexing,
-- vector search security, and embedding worker claim RPC.

-- =============================================================================
-- 1. Extend knowledge_category enum
-- =============================================================================
ALTER TYPE knowledge_category ADD VALUE IF NOT EXISTS 'brand_guide';
ALTER TYPE knowledge_category ADD VALUE IF NOT EXISTS 'conversation';
ALTER TYPE knowledge_category ADD VALUE IF NOT EXISTS 'ai_response';

-- =============================================================================
-- 2. Source metadata index (dedupe + ingestion lookups)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_knowledge_entries_source
  ON knowledge_entries (tenant_id, (metadata->>'source_type'), (metadata->>'source_id'))
  WHERE metadata->>'source_type' IS NOT NULL AND metadata->>'source_id' IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_entries_embedding_pending
  ON knowledge_entries (embedding_status, updated_at)
  WHERE embedding_status IN ('pending', 'processing');

-- =============================================================================
-- 3. search_knowledge_vector — require tenant membership (KB-04 parity)
-- =============================================================================
CREATE OR REPLACE FUNCTION search_knowledge_vector(
  p_tenant_id UUID,
  p_query_embedding vector(1536),
  p_categories knowledge_category[] DEFAULT NULL,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  entry_id UUID,
  chunk_id UUID,
  category knowledge_category,
  title TEXT,
  chunk_content TEXT,
  similarity REAL
) AS $$
BEGIN
  IF NOT public.is_member_of(p_tenant_id) THEN
    RAISE EXCEPTION 'Not a member of tenant';
  END IF;

  RETURN QUERY
  SELECT
    ke.id AS entry_id,
    emb.id AS chunk_id,
    ke.category,
    ke.title,
    emb.content AS chunk_content,
    (1 - (emb.embedding <=> p_query_embedding))::REAL AS similarity
  FROM knowledge_embeddings emb
  JOIN knowledge_entries ke ON ke.id = emb.entry_id
  WHERE emb.tenant_id = p_tenant_id
    AND emb.embedding IS NOT NULL
    AND (p_categories IS NULL OR ke.category = ANY(p_categories))
  ORDER BY emb.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- 4. Claim pending embedding jobs (service-role cron worker)
-- =============================================================================
CREATE OR REPLACE FUNCTION claim_knowledge_embedding_jobs(p_limit INT DEFAULT 20)
RETURNS TABLE (
  entry_id UUID,
  tenant_id UUID,
  category knowledge_category,
  title TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT ke.id
    FROM knowledge_entries ke
    WHERE ke.embedding_status IN ('pending', 'processing')
      AND EXISTS (
        SELECT 1 FROM knowledge_embeddings emb
        WHERE emb.entry_id = ke.id AND emb.embedding IS NULL
      )
    ORDER BY ke.updated_at ASC
    LIMIT p_limit
    FOR UPDATE OF ke SKIP LOCKED
  ),
  updated AS (
    UPDATE knowledge_entries ke
    SET embedding_status = 'processing', updated_at = now()
    FROM claimed c
    WHERE ke.id = c.id
    RETURNING ke.id, ke.tenant_id, ke.category, ke.title
  )
  SELECT u.id, u.tenant_id, u.category, u.title FROM updated u;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

REVOKE ALL ON FUNCTION claim_knowledge_embedding_jobs FROM PUBLIC;

COMMENT ON FUNCTION claim_knowledge_embedding_jobs IS
  'Atomically claim knowledge entries with pending embedding chunks for background worker';
