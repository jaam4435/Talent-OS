# 18 — Data Model

| Field | Value |
|-------|-------|
| **Version** | 1.0.0 |
| **Status** | Draft — Awaiting Approval |
| **Owner** | Platform Architecture |
| **Related** | [04 Domain Model](04%20Domain%20Model.md) · [13 Security Model](13%20Security%20Model.md) · [docs/database.md](../database.md) |

---

## Database Platform

| Property | Value |
|----------|-------|
| Engine | PostgreSQL 15 (Supabase) |
| Isolation | Row Level Security on all tenant tables |
| Extensions | `vector` (pgvector), `pg_trgm` (where enabled) |
| Migrations | 18 sequential SQL files (`001`–`018`) |
| TypeScript types | `modules/core/types/database.ts` |

---

## Entity Relationship Overview

```
tenants
  ├── tenant_members → profiles
  ├── freelancers
  │     ├── freelancer_portfolio_items
  │     └── freelancer_rating_history
  ├── companies
  ├── opportunities
  │     ├── opportunity_recipients
  │     ├── shortlists → shortlist_items
  │     └── talent_match_scores
  ├── projects
  │     └── milestones → tasks
  ├── payments / invoices
  ├── domain_events
  │     └── workflow_runs → workflow_jobs
  │           └── approval_requests
  ├── ai_requests
  ├── knowledge_entries → knowledge_embeddings
  ├── agent_configs / agent_sessions / agent_memory_entries
  ├── agent_instruction_versions
  ├── whatsapp_conversations / whatsapp_messages
  ├── integration_configs
  ├── webhook_deliveries
  ├── notifications / email_logs
  └── activity_logs
```

---

## Migration History

| Range | Focus | Key Tables |
|-------|-------|------------|
| 001–004 | Core schema | tenants, freelancers, opportunities, projects, RLS, views |
| 005–006 | Events + integrity | domain_events, ai_requests, webhook_deliveries |
| 007–013 | Features | invites, portfolio, companies, project RPC |
| 014–015 | Automation + WhatsApp | workflow_*, whatsapp_conversations |
| 016–017 | Platform | knowledge_*, agent_* |
| 018 | Marketplace blueprint | Extensions (not fully applied in services) |

Auto-generated: [generated/migrations.md](../generated/migrations.md)

---

## Core Tables

### Identity & Tenancy

| Table | PK | Tenant FK | Notes |
|-------|-----|-----------|-------|
| `tenants` | id | — | Root aggregate |
| `profiles` | id | — | Linked to auth.users |
| `tenant_members` | id | tenant_id | Role + status + company_id |

### Talent

| Table | PK | Key Columns |
|-------|-----|-------------|
| `freelancers` | id | skills[], discipline, availability, phone, user_id |
| `freelancer_portfolio_items` | id | storage refs, display_order |
| `freelancer_rating_history` | id | manager-only ratings |

### CRM & Assignment

| Table | PK | Key Columns |
|-------|-----|-------------|
| `companies` | id | name, contact info |
| `opportunities` | id | status, required_skills[], budget |
| `opportunity_recipients` | id | freelancer_id, response status |
| `shortlists` / `shortlist_items` | id | curated candidates |
| `talent_match_scores` | id | ai_request_id, score, rank |

### Projects & Finance

| Table | PK | Key Columns |
|-------|-----|-------------|
| `projects` | id | status, freelancer_id, ai_status_assessment |
| `milestones` | id | status, due_date, submission_note |
| `payments` | id | status, amount, milestone_id |

---

## Platform Tables

### Event Outbox

**`domain_events`**

| Column | Index Notes |
|--------|-------------|
| `status` | Partial index on pending — **target:** align with query `(status, scheduled_at)` |
| `idempotency_key` | UNIQUE (tenant_id, idempotency_key) |
| `correlation_id` | Trace index |
| `scheduled_at` | Retry scheduling |

### Workflow

| Table | Purpose |
|-------|---------|
| `workflow_runs` | Workflow instance per trigger |
| `workflow_jobs` | Step jobs in named queues |
| `approval_requests` | Human gates |

### AI

**`ai_requests`**

| Column | Purpose |
|--------|---------|
| `request_type` | talent_match, brief_parse, etc. |
| `prompt_hash` | SHA-256 — never raw prompt |
| `status` | pending → processing → completed/failed |
| `entity_type/id` | Linked entity |

### Knowledge

**`knowledge_entries`**

| Column | Purpose |
|--------|---------|
| `search_vector` | Generated tsvector |
| `embedding_status` | Pipeline state |
| `entity_type/id` | Polymorphic link |

**`knowledge_embeddings`**

| Column | Purpose |
|--------|---------|
| `embedding` | vector(1536), NULL until indexed |
| `chunk_index` | UNIQUE (entry_id, chunk_index) |

HNSW index: `vector_cosine_ops` WHERE embedding IS NOT NULL.

### Agents

| Table | Purpose |
|-------|---------|
| `agent_configs` | Tenant tool/memory overrides |
| `agent_instruction_versions` | Server-side prompt content |
| `agent_sessions` | Run context |
| `agent_memory_entries` | Scoped persistent memory |

---

## Key Enums

| Enum | Values |
|------|--------|
| `discipline_type` | design, video, copy, motion, brand, other |
| `availability_status` | available, busy, unavailable |
| `opportunity_status` | draft, open, filled, closed, canceled |
| `project_status` | draft, active, on_hold, in_review, completed, canceled |
| `milestone_status` | pending, in_progress, submitted, approved, revision, … |
| `payment_status` | pending, approved, processing, paid, disputed, canceled |
| `event_status` | pending, processing, delivered, failed, dead_letter |
| `ai_request_status` | pending, processing, completed, failed |
| `knowledge_category` | meeting_note, sop, client_preference, … |
| `agent_id` | recruiter, project_manager, finance, qa, executive, knowledge |

---

## RLS Strategy

| Role | Pattern |
|------|---------|
| Manager | `is_manager_of(tenant_id)` — full CRUD |
| Freelancer | Own records + assigned projects |
| Client | Company-linked rows |

Helper functions in PostgreSQL; policies per table in migrations 002, 006, 016, 017.

**Service role bypass:** Application must enforce tenant filters. See [13 Security Model](13%20Security%20Model.md).

---

## RPC Functions

| Function | Security | Purpose |
|----------|----------|---------|
| `emit_domain_event()` | SECURITY DEFINER | Transactional outbox insert |
| `create_tenant_with_admin()` | SECURITY DEFINER | **Fix:** auth.uid() guard |
| `link_freelancer_to_user()` | SECURITY DEFINER | **Fix:** auth.uid() guard |
| `create_project_with_milestones()` | SECURITY DEFINER | Atomic project create |
| `search_freelancers()` | SECURITY DEFINER | Full-text roster search |
| `search_knowledge_entries()` | SECURITY DEFINER | FTS knowledge search |
| `search_knowledge_vector()` | SECURITY DEFINER | Vector similarity |
| `suggest_talent_for_opportunity()` | SECURITY DEFINER | Rule-based match |
| `check_talent_availability()` | SECURITY DEFINER | Marketplace availability |

---

## Indexing Strategy

| Query Pattern | Index |
|---------------|-------|
| Outbox poll | `(status, scheduled_at) WHERE status IN (pending, failed)` — **target** |
| Pending jobs | `(queue_name, status, scheduled_at)` |
| Tenant list by created | `(tenant_id, created_at DESC)` — most tables |
| Knowledge FTS | GIN on `search_vector` |
| Vector search | HNSW on `embedding` |
| WhatsApp tenant lookup | **Target:** `(provider, config->phone_number_id)` or dedicated column |

---

## Data Lifecycle

| Table | Retention Target |
|-------|------------------|
| `webhook_deliveries` | 72 hours |
| `domain_events` (delivered) | 30 days → archive |
| `workflow_jobs` (completed) | 30 days → archive |
| `ai_requests` | 1 year (cost audit) |
| `activity_logs` | 2 years |
| Business entities | Indefinite (tenant delete cascades) |

**Target:** Archival cron jobs. Currently documented but not implemented.

---

## Marketplace Schema (Blueprint)

Migration 018 extends:

- `freelancers` — marketplace visibility columns
- `talent_availability_blocks` — calendar capacity
- `marketplace_ratings`, `marketplace_contracts`, `marketplace_invitations`, `marketplace_recommendations`

See [11 Marketplace Platform](11%20Marketplace%20Platform.md).

---

## Migration Standards

1. Numbered prefix `NNN_name.sql`
2. Header comment with dependencies
3. Additive changes preferred
4. RLS policies in same migration as table
5. REVOKE/GRANT documented for SECURITY DEFINER functions
6. Rollback notes in PR description

See [15 Engineering Standards](15%20Engineering%20Standards.md).

---

## Cross-References

| Document | Relationship |
|----------|--------------|
| [04 Domain Model](04%20Domain%20Model.md) | Logical model |
| [11 Marketplace Platform](11%20Marketplace%20Platform.md) | Planned schema |
| [docs/04-supabase-complete-schema.md](../04-supabase-complete-schema.md) | Legacy RLS matrix |
| [generated/repositories.md](../generated/repositories.md) | Code mapping |
