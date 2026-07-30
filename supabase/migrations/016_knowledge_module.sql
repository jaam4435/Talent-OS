-- Talent OS — Knowledge Module
-- Depends on: 001, 012 (companies)
-- Stores meeting notes, SOPs, client preferences, project history, deliverables,
-- feedback, documents. Embeddings table prepared for future vector search (no AI yet).

CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- ENUMS
-- =============================================================================
CREATE TYPE knowledge_category AS ENUM (
  'meeting_note',
  'sop',
  'client_preference',
  'project_history',
  'deliverable',
  'feedback',
  'document'
);

CREATE TYPE knowledge_embedding_status AS ENUM (
  'pending',
  'processing',
  'indexed',
  'failed',
  'skipped'
);

-- =============================================================================
-- KNOWLEDGE ENTRIES
-- =============================================================================
CREATE TABLE knowledge_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category          knowledge_category NOT NULL,
  title             TEXT NOT NULL,
  content           TEXT,
  summary           TEXT,
  -- Polymorphic + direct FKs for efficient filtering
  entity_type       TEXT,
  entity_id         UUID,
  company_id        UUID REFERENCES companies(id) ON DELETE SET NULL,
  project_id        UUID REFERENCES projects(id) ON DELETE SET NULL,
  opportunity_id    UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  freelancer_id     UUID REFERENCES freelancers(id) ON DELETE SET NULL,
  milestone_id      UUID REFERENCES milestones(id) ON DELETE SET NULL,
  -- File-backed entries (documents, deliverables)
  storage_bucket    TEXT,
  storage_path      TEXT,
  mime_type         TEXT,
  file_size_bytes   BIGINT,
  tags              TEXT[] NOT NULL DEFAULT '{}',
  metadata          JSONB NOT NULL DEFAULT '{}',
  embedding_status  knowledge_embedding_status NOT NULL DEFAULT 'pending',
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_vector     tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'english',
      coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(content, '')
    )
  ) STORED
);

CREATE INDEX idx_knowledge_entries_tenant ON knowledge_entries(tenant_id, created_at DESC);
CREATE INDEX idx_knowledge_entries_category ON knowledge_entries(tenant_id, category);
CREATE INDEX idx_knowledge_entries_company ON knowledge_entries(tenant_id, company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_knowledge_entries_project ON knowledge_entries(tenant_id, project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_knowledge_entries_entity ON knowledge_entries(tenant_id, entity_type, entity_id);
CREATE INDEX idx_knowledge_entries_search ON knowledge_entries USING gin(search_vector);
CREATE INDEX idx_knowledge_entries_tags ON knowledge_entries USING gin(tags);

-- =============================================================================
-- KNOWLEDGE EMBEDDINGS (vector search — populated by future AI pipeline)
-- =============================================================================
CREATE TABLE knowledge_embeddings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entry_id          UUID NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  chunk_index       INTEGER NOT NULL,
  content           TEXT NOT NULL,
  token_count       INTEGER,
  embedding         vector(1536),
  model             TEXT,
  model_version     TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entry_id, chunk_index)
);

CREATE INDEX idx_knowledge_embeddings_tenant ON knowledge_embeddings(tenant_id);
CREATE INDEX idx_knowledge_embeddings_entry ON knowledge_embeddings(entry_id);
CREATE INDEX idx_knowledge_embeddings_vector ON knowledge_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

-- =============================================================================
-- FULL-TEXT SEARCH (available now, no AI required)
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Vector search RPC (ready for AI pipeline; returns nothing until embeddings exist)
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
-- RLS
-- =============================================================================
ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "knowledge_entries_select_manager" ON knowledge_entries FOR SELECT TO authenticated
  USING (is_manager_of(tenant_id));

CREATE POLICY "knowledge_entries_insert_manager" ON knowledge_entries FOR INSERT TO authenticated
  WITH CHECK (is_manager_of(tenant_id));

CREATE POLICY "knowledge_entries_update_manager" ON knowledge_entries FOR UPDATE TO authenticated
  USING (is_manager_of(tenant_id));

CREATE POLICY "knowledge_entries_delete_manager" ON knowledge_entries FOR DELETE TO authenticated
  USING (is_manager_of(tenant_id));

CREATE POLICY "knowledge_entries_select_client" ON knowledge_entries FOR SELECT TO authenticated
  USING (
    company_id IS NOT NULL
    AND company_id IN (
      SELECT tm.company_id FROM tenant_members tm
      WHERE tm.user_id = auth.uid() AND tm.role = 'client' AND tm.company_id IS NOT NULL
    )
  );

CREATE POLICY "knowledge_embeddings_select_manager" ON knowledge_embeddings FOR SELECT TO authenticated
  USING (is_manager_of(tenant_id));

CREATE POLICY "knowledge_embeddings_insert_manager" ON knowledge_embeddings FOR INSERT TO authenticated
  WITH CHECK (is_manager_of(tenant_id));

CREATE POLICY "knowledge_embeddings_update_manager" ON knowledge_embeddings FOR UPDATE TO authenticated
  USING (is_manager_of(tenant_id));

CREATE POLICY "knowledge_embeddings_delete_manager" ON knowledge_embeddings FOR DELETE TO authenticated
  USING (is_manager_of(tenant_id));

-- updated_at trigger
CREATE TRIGGER trg_knowledge_entries_updated_at
  BEFORE UPDATE ON knowledge_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

REVOKE ALL ON FUNCTION search_knowledge_entries FROM PUBLIC;
REVOKE ALL ON FUNCTION search_knowledge_vector FROM PUBLIC;

COMMENT ON TABLE knowledge_entries IS 'Tenant knowledge base: notes, SOPs, preferences, history, deliverables, feedback, documents';
COMMENT ON TABLE knowledge_embeddings IS 'Chunked embeddings for vector search (1536-dim, populated by future AI pipeline)';
COMMENT ON COLUMN knowledge_embeddings.embedding IS 'NULL until embedding pipeline runs; use vector_cosine_ops for similarity';
