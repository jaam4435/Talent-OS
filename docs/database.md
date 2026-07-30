# Database

PostgreSQL 15 on Supabase. All tenant data is isolated via Row Level Security (RLS).

> **Auto-generated migration list:** [generated/migrations.md](./generated/migrations.md)  
> **Auto-generated repository list:** [generated/repositories.md](./generated/repositories.md)

---

## Schema Overview

```
tenants ──┬── tenant_members ── profiles
          ├── freelancers ──┬── freelancer_portfolio_items
          │                 └── freelancer_rating_history
          ├── companies
          ├── opportunities ──┬── opportunity_recipients
          │                   └── shortlists ── shortlist_items
          ├── projects ── milestones ── payments
          ├── domain_events ── workflow_runs ── workflow_jobs
          ├── ai_requests ── talent_match_scores
          ├── knowledge_entries ── knowledge_embeddings
          ├── agent_configs ── agent_sessions ── agent_memory_entries
          └── whatsapp_conversations ── whatsapp_messages
```

---

## Migrations

Apply in filename order via `supabase db push`:

| Range | Focus |
|---|---|
| 001–004 | Core schema, RLS, functions, analytics views |
| 005–006 | Events, AI requests, integrity |
| 007–013 | Auth invites, project RPC, AI PM, companies |
| 014–015 | Workflow engine, WhatsApp conversations |
| 016–018 | Knowledge, agents, marketplace architecture |

Full list with summaries: [generated/migrations.md](./generated/migrations.md)

---

## Key Enums

| Enum | Values |
|---|---|
| `discipline_type` | design, video, copy, motion, brand, other |
| `availability_status` | available, busy, unavailable |
| `opportunity_status` | draft, open, filled, closed, canceled |
| `project_status` | draft, active, on_hold, completed, canceled |
| `payment_status` | pending, approved, processing, paid, disputed, canceled |
| `knowledge_category` | meeting_note, sop, client_preference, … |
| `agent_id` | recruiter, project_manager, finance, qa, executive, knowledge |

TypeScript types: `modules/core/types/database.ts`

---

## RLS Strategy

| Role | Access |
|---|---|
| **Manager** | Full CRUD on tenant data via `is_manager_of(tenant_id)` |
| **Freelancer** | Own profile, assigned projects, own payments |
| **Client** | Company-linked projects and knowledge entries |

Helper functions: `is_manager_of()`, `is_member_of()`, `manager_tenant_ids()`

---

## Extensions

| Extension | Used by |
|---|---|
| `pgvector` | Knowledge embeddings (vector search) |
| `pg_trgm` | Full-text / fuzzy search (where enabled) |

---

## RPC Functions

| Function | Purpose |
|---|---|
| `search_freelancers()` | Talent roster search |
| `suggest_talent_for_opportunity()` | Rule-based matching |
| `create_project_with_milestones()` | Atomic project creation |
| `emit_domain_event()` | Outbox insert |
| `search_knowledge_entries()` | Full-text knowledge search |
| `search_knowledge_vector()` | Vector similarity (future AI) |
| `check_talent_availability()` | Marketplace availability |

---

## Related

- [03 Database Schema](./03-database-schema.md) — ERD and table detail
- [04 Supabase Complete Schema](./04-supabase-complete-schema.md) — RLS matrix
- [08 Multi-Tenant Architecture](./08-multi-tenant-architecture.md)
- [35 Marketplace Architecture](./35-marketplace-architecture.md)
