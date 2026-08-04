# Knowledge Module

Tenant-scoped knowledge base for meeting notes, SOPs, client preferences, project history, deliverables, feedback, and documents. Embeddings are stored in a separate table and prepared for future vector search — **no AI pipeline is implemented yet**.

## Categories

| Category | Enum value | Use case |
|---|---|---|
| Meeting Notes | `meeting_note` | Call notes, standups, client meetings |
| SOPs | `sop` | Standard operating procedures |
| Client Preferences | `client_preference` | Brand guidelines, communication prefs |
| Project History | `project_history` | Timeline, decisions, context |
| Deliverables | `deliverable` | Final outputs, file references |
| Feedback | `feedback` | Client or internal feedback |
| Documents | `document` | General file-backed documents |

## Schema

```
knowledge_entries          — unified entry table (all categories)
  ├── category             — knowledge_category enum
  ├── title, content, summary
  ├── entity_type / entity_id  — polymorphic link
  ├── company_id, project_id, … — direct FKs for filtering
  ├── storage_bucket/path    — file-backed entries
  ├── embedding_status       — pending | processing | indexed | failed | skipped
  └── search_vector          — generated tsvector (full-text search now)

knowledge_embeddings       — chunked text for vector search
  ├── entry_id, chunk_index
  ├── content, token_count
  └── embedding vector(1536) — NULL until AI pipeline runs
```

Migration: `supabase/migrations/016_knowledge_module.sql`

## Search

| Method | Status | How |
|---|---|---|
| **Full-text** | Available now | `search_knowledge_entries()` RPC via `KnowledgeService.search()` |
| **Vector** | Schema ready | `search_knowledge_vector()` RPC via `KnowledgeService.searchVector()` — requires pre-computed query embedding |

## Embedding pipeline (future)

On create/update with content, `KnowledgeService` automatically:

1. Splits text into ~1500-char chunks
2. Inserts rows into `knowledge_embeddings` **without vectors**
3. Sets entry `embedding_status` to `pending`

When AI is added, a background job will:

1. Call `lib/ai/` gateway to generate embeddings
2. Call `KnowledgeService.storeEmbeddingVector()` per chunk
3. Update status to `indexed` when all chunks have vectors

## Code layout

```
modules/knowledge/
  types.ts           — domain types, category labels
  validation.ts      — Zod schemas

lib/repositories/
  knowledge.repository.ts
  knowledge-embedding.repository.ts

lib/services/knowledge.service.ts
lib/queries/knowledge.queries.ts
app/actions/knowledge.ts
```

## Usage

```typescript
// Server action (mutations)
import { createKnowledgeEntry } from '@/app/actions/knowledge'

await createKnowledgeEntry({
  category: 'meeting_note',
  title: 'Kickoff call — Acme Corp',
  content: 'Discussed timeline and deliverables…',
  links: { projectId: '…', companyId: '…' },
})

// Query layer (reads in Server Components)
import { listKnowledgeByProject, searchKnowledge } from '@/lib/queries/knowledge.queries'

const entries = await listKnowledgeByProject(tenantId, projectId)
const results = await searchKnowledge(tenantId, 'brand guidelines', {
  categories: ['client_preference', 'sop'],
})
```

## Access control

- **Managers**: full CRUD on entries and embeddings
- **Clients**: read entries linked to their company (`company_id` match via `tenant_members`)
