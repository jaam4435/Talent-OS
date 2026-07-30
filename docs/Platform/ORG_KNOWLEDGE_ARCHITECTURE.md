# Organization Knowledge Architecture

Architecture for tenant-scoped organization knowledge: storage, embeddings, semantic search, and ingestion. **No UI** — service and worker layers only.

## Overview

Organization Knowledge extends the existing Knowledge Platform with eight content buckets, an embedding pipeline, hybrid semantic search, and ingestion adapters for conversations, AI responses, and domain events.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Ingestion Adapters                          │
│  conversation-ingest │ ai-response-ingest │ domain-event-ingest │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    OrgKnowledgeStore
                             │
                    KnowledgeService  ──► EventPlatform (embedding_requested)
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     KnowledgeRepository  EmbeddingRepo   AiGateway.embed()
              │              │
              ▼              ▼
     knowledge_entries   knowledge_embeddings (vector 1536)
              │
              ▼
     hybridSemanticSearch (FTS + vector)
```

## Content Buckets

| Bucket | Category enum | Source type metadata |
|--------|---------------|----------------------|
| Meetings | `meeting_note` | `meeting` |
| Deliverables | `deliverable` | `deliverable` |
| Client Feedback | `feedback` | `client_feedback` |
| Brand Guides | `brand_guide` | `brand_guide` |
| SOPs | `sop` | `sop` |
| Conversations | `conversation` | `conversation` |
| AI Responses | `ai_response` | `ai_response` |
| Project History | `project_history` | `project_history` |

Additional categories (`client_preference`, `document`) remain for legacy and manual entries.

## Storage Layer

### Tables (migration `016_knowledge_module.sql`, extended by `022_org_knowledge.sql`)

- **`knowledge_entries`** — canonical record per knowledge item
  - Full-text via generated `search_vector` column
  - `embedding_status`: `pending` → `processing` → `indexed` | `failed` | `skipped`
  - `metadata.source_type` + `metadata.source_id` for deduplication

- **`knowledge_embeddings`** — chunked content with optional `vector(1536)`
  - HNSW index on `embedding` for cosine similarity
  - Chunks created at write time (~1500 chars); vectors populated by worker

### Service Layer

All access flows through **`KnowledgeService`** (never repositories from MCP or ingestion):

| Method | Purpose |
|--------|---------|
| `createEntry` / category helpers | CRUD with chunk preparation |
| `semanticSearch` | Hybrid FTS + vector retrieval |
| `indexEntry` | Embed pending chunks for one entry |
| `findBySource` | Dedupe by `source_type` + `source_id` |
| `claimPendingEmbeddingJobs` | Atomic claim for cron worker |

**`OrgKnowledgeStore`** (`lib/knowledge/org-knowledge.ts`) provides typed store methods with consistent metadata envelopes.

## Embedding Pipeline

1. **Write path**: `createEntry` → `prepareEmbeddingChunks` → emit `knowledge.embedding_requested`
2. **Worker**: cron `GET /api/cron/process-knowledge-embeddings`
   - Calls `claim_knowledge_embedding_jobs` RPC (SKIP LOCKED)
   - `KnowledgeService.indexEntry` → `AiGateway.embed()` via `lib/ai/embeddings.ts`
   - OpenAI `text-embedding-3-small` (1536 dimensions)
   - Emits `knowledge.embedding_completed`

### Configuration

- Requires `OPENAI_API_KEY`
- Cron auth via system bearer token (same as other cron routes)

## Semantic Search

**`hybridSemanticSearch`** (`lib/knowledge/semantic-search.ts`):

1. Embed query via `embedText`
2. Parallel FTS (`search_knowledge_entries`) + vector (`search_knowledge_vector`)
3. Merge by entry ID with weighted scoring (default 60% vector, 40% FTS)
4. Return ranked `SemanticSearchResult[]` with `matchSources`

Both search RPCs enforce `is_member_of(tenant_id)` (migration `022` adds guard to vector search).

## Ingestion Adapters

Architecture-only hooks — no UI:

| Adapter | File | Trigger |
|---------|------|---------|
| Conversations | `lib/knowledge/ingest/conversation-ingest.ts` | WhatsApp, agent sessions |
| AI responses | `lib/knowledge/ingest/ai-response-ingest.ts` | `ai_requests` completion |
| Domain events | `lib/knowledge/ingest/domain-event-ingest.ts` | Milestone, feedback, project events |

Ingestion uses `OrgKnowledgeStore` for deduplication via `source_id`.

## MCP Tools

Extended knowledge server (`lib/mcp/servers/knowledge.server.ts`):

| Tool | Service method |
|------|----------------|
| `knowledge_semantic_search` | `KnowledgeService.semanticSearch` |
| `knowledge_get_entry` | `KnowledgeService.getEntry` |
| `knowledge_create_entry` | `KnowledgeService.createEntry` |

## Security

- RLS on `knowledge_entries` / `knowledge_embeddings` (manager + client read policies)
- Search RPCs: SECURITY DEFINER + membership check
- Embedding worker: service-role admin context, tenant-scoped claims
- MCP: RBAC via `McpGateway` + tenant scoping in handlers

## File Map

```
lib/knowledge/
  org-knowledge.ts          # Typed org store + metadata
  semantic-search.ts        # Hybrid retrieval
  embedding-worker.ts       # Background indexing
  ingest/
    conversation-ingest.ts
    ai-response-ingest.ts
    domain-event-ingest.ts
lib/ai/embeddings.ts        # OpenAI embedding client
lib/services/knowledge.service.ts
supabase/migrations/022_org_knowledge.sql
app/api/cron/process-knowledge-embeddings/route.ts
```

## Future (out of scope)

- UI for browsing/editing organization knowledge
- Real-time ingestion webhooks from WhatsApp/AI modules
- Cross-tenant knowledge federation
- Reranker model for semantic results
