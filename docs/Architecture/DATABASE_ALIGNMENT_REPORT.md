# Talent OS — Database Alignment Report

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Draft — awaiting approval  
**Scope:** Compare live PostgreSQL schema (migrations `001`–`031`) against approved `DOMAIN_MODEL.md`  
**Action:** Analysis only — **no migrations proposed or applied**

---

## Executive summary

The database schema is **largely aligned** with the approved domain model. All 12 bounded contexts have corresponding tables, and **RLS is enabled on 100% of tables (84/84)**. Module migrations (`023`–`031`) added the expected audit logs, soft deletes, and tenant-scoped indexes.

However, several **modeling gaps, integrity weaknesses, and operational risks** remain:

| Category | Severity | Count |
|----------|----------|------:|
| Missing tables (domain-implied) | Medium | 3 |
| Missing indexes | Medium–High | 18 |
| Wrong / weak relationships | Medium | 12 |
| RLS gaps (intentional but risky) | Medium | 21 |
| Missing constraints | Medium | 14 |
| Duplicate / denormalized data | Low–Medium | 9 |
| Performance concerns | Medium | 11 |

**Overall assessment:** Production-viable for current modular monolith, but **not fully DDD-pure**. Legacy tables (`activity_logs`, flat events) coexist with module audit tables. Several domain invariants are enforced in application code only, not in the database.

---

## Methodology

1. Inventoried all `CREATE TABLE` statements across `supabase/migrations/*.sql` (84 tables, 31 migrations).
2. Mapped each table to bounded contexts in `DOMAIN_MODEL.md` and specs in `docs/Architecture/specs/`.
3. Reviewed indexes, foreign keys, CHECK constraints, unique constraints, and RLS policies per table.
4. Cross-referenced application validation in `modules/*/validation.ts` for invariants not enforced in DB.
5. Identified duplicate data paths and query hot spots from analytics RPCs (`031_analytics_module.sql`).

**Sources:**

| Artifact | Path |
|----------|------|
| Migrations | `supabase/migrations/001`–`031` |
| Domain model | `docs/Architecture/DOMAIN_MODEL.md` |
| RLS helpers | `006_complete_rls_and_integrity.sql` |
| TypeScript DB types | `modules/core/types/database.ts` |

---

## Schema coverage matrix

| Bounded context | Domain aggregates | DB tables | Coverage |
|-----------------|-------------------|-----------|----------|
| Organization | 5 roots + audit | 8 | ✅ Complete |
| CRM & Demand | 8 roots + collateral | 15 | ✅ Complete |
| Talent Supply | 7 roots + audit | 8 | ✅ Complete |
| Project Delivery | 5 roots + entities | 10 | ✅ Complete |
| Resource Assignment | 3 roots + entities | 7 | ✅ Complete |
| Finance & Payments | Payment | 1 | ⚠️ Thin (by design) |
| Workflow Orchestration | 4 roots + outbox | 8 | ✅ Complete |
| WhatsApp Channel | 3 roots + memory | 6 | ⚠️ Message–conversation link weak |
| AI & Intelligence | 3 sub-contexts | 8 | ✅ Complete |
| Analytics & Reporting | Export + cache | 2 | ✅ Complete |
| Platform Core | Flags, config, observability | 7 | ✅ Complete |
| Notifications | Notification | 1 | ⚠️ No preferences table |

**Supporting / integration:** `activity_logs`, `email_logs`, `integration_configs`, `webhook_deliveries`, `api_idempotency_responses`

---

## 1. Missing tables

Tables implied by the domain model or implementation specs that **do not exist** in migrations.

### 1.1 Recommended (domain-aligned)

| Table | Context | Domain reference | Impact |
|-------|---------|------------------|--------|
| `finance_audit_logs` | Finance | `FINANCE_SPEC.md` — future audit | Payment mutations only in `activity_logs` / triggers; no immutable finance audit trail |
| `notification_preferences` | Notifications | Future enhancement in specs | No per-user channel/category toggles |
| `payment_disputes` | Finance | `PaymentStatus.disputed` exists | Dispute workflow uses `dispute_reason` column only; no dispute aggregate |

### 1.2 Optional (deferred by design)

| Table | Context | Notes |
|-------|---------|-------|
| `stripe_customers` | Organization / Finance | `subscription_reference` on `tenants` is sufficient for MVP |
| `deal_opportunity_links` | CRM | Bidirectional link exists as columns (`crm_deals.opportunity_id`, `opportunities.crm_deal_id`) — junction table not required |

### 1.3 Not missing (confirmed present)

All aggregate roots named in `DOMAIN_MODEL.md` exist:

- `tenants`, `org_departments`, `org_teams`, `org_team_members`, `tenant_members`, `member_invites`, `organization_audit_logs`
- `crm_*` (9 tables), `companies`, `opportunities`, `opportunity_recipients`, `shortlists`, `shortlist_items`, `talent_match_scores`
- `freelancers`, `talent_*` (5 tables), `freelancer_portfolio_items`, `freelancer_rating_history`
- `projects`, `milestones`, `project_*` (8 tables)
- `assignment_*` (6 tables)
- `payments`
- `domain_events`, `workflow_*` (7 tables), `approval_requests`
- `whatsapp_*` (5 tables), `whatsapp_messages`, `webhook_deliveries`
- `ai_requests`, `agent_*` (5 tables), `knowledge_*` (2 tables)
- `analytics_exports`, `analytics_cache_snapshots`
- `platform_*` (6 tables), `notifications`

---

## 2. Missing indexes

Indexes expected by domain access patterns or analytics RPCs but **absent or incomplete**.

### 2.1 High priority

| Table | Recommended index | Reason |
|-------|-------------------|--------|
| `assignment_allocations` | `(opportunity_id) WHERE deleted_at IS NULL` | Opportunity-linked allocations queried; only `project_id` indexed |
| `domain_events` | `(status, scheduled_at) WHERE status IN ('pending', 'failed')` | Cron dispatch uses status; current partial index is `(created_at) WHERE status = 'pending'` only |
| `payments` | `(tenant_id, status, created_at)` | Revenue aging dashboard scans pending/paid by date |
| `payments` | `(paid_at) WHERE paid_at IS NOT NULL` | Revenue trend RPC time-series |
| `whatsapp_messages` | `(tenant_id, created_at DESC)` | Observability RPC counts recent messages |
| `whatsapp_messages` | `(phone, tenant_id)` | Inbound routing by phone (index on conversations exists; messages don't) |
| `opportunity_recipients` | `(freelancer_id, response) WHERE response = 'pending'` | WhatsApp YES/NO lookup for pending invites |
| `workflow_jobs` | `(tenant_id, status) WHERE status = 'dead_letter'` | Admin retry UI and analytics |
| `crm_audit_logs` | `(tenant_id, entity_type, entity_id)` | Parity with other module audit tables |
| `activity_logs` | `(tenant_id, created_at DESC)` | Exists but `(tenant_id, action)` missing for filtered queries |

### 2.2 Medium priority

| Table | Recommended index | Reason |
|-------|-------------------|--------|
| `freelancers` | `(tenant_id, phone) WHERE deleted_at IS NULL` | Partial index exists (`020`); verify covers NULL phone filter |
| `freelancers` | GIN on `to_tsvector('simple', full_name \|\| ' ' \|\| email)` | Advanced search RPC uses filters; text search on name not indexed |
| `companies` | `(tenant_id, lower(name))` | Domain invariant: unique name per tenant — no index supports lookup |
| `projects` | `(freelancer_id, status) WHERE deleted_at IS NULL` | Freelancer dashboard queries |
| `milestones` | `(status, due_date) WHERE status NOT IN ('approved', 'canceled')` | Overdue cron (`check-overdue-milestones`) |
| `notifications` | `(tenant_id, user_id, created_at DESC)` | Tenant-scoped notification feeds |
| `analytics_exports` | `(expires_at) WHERE status != 'expired'` | Future expiry cleanup job |
| `member_invites` | `(email, tenant_id) WHERE accepted_at IS NULL AND revoked_at IS NULL` | Pending invite lookup |

### 2.3 Low priority / future scale

| Table | Notes |
|-------|-------|
| `knowledge_embeddings` | Vector index exists (`idx_knowledge_embeddings_vector`); monitor at >100k chunks |
| `platform_log_entries` | Consider BRIN on `created_at` for high-volume log retention |
| `agent_messages` | `(session_id, created_at)` exists; sufficient for current scale |

---

## 3. Wrong relationships

Foreign keys, cardinality, and aggregate boundaries that **diverge from the domain model**.

### 3.1 Structural mismatches

| Issue | Tables | Domain expectation | Current state | Risk |
|-------|--------|-------------------|---------------|------|
| **WhatsApp message orphan** | `whatsapp_messages` ↔ `whatsapp_conversations` | `InboundMessage` belongs to `Conversation` | No `conversation_id` FK; linked only via `freelancer_id` + `phone` | Duplicate phones, session split, memory desync |
| **Memory not tied to conversation** | `whatsapp_memory_entries` | Turn history per session | FK to `freelancer_id` only, not `conversation_id` | Cannot isolate multi-session history |
| **Allocation target optional** | `assignment_allocations` | Links to project **or** opportunity | Both `project_id` and `opportunity_id` nullable; no XOR constraint | Allocations with no target possible |
| **Dual allocation targets** | `assignment_allocations` | Single allocation target | Both columns can be set simultaneously | Ambiguous ownership |
| **Project vs assignment drift** | `projects.freelancer_id` vs `assignment_allocations` | Single source of truth for who is assigned | Independent columns; no sync trigger | Project shows freelancer A; allocation shows freelancer B |
| **Company name not unique** | `companies` | Unique name per tenant (domain invariant) | `UNIQUE (tenant_id, slug)` only; name unconstrained | Duplicate client names |
| **Member invite re-use blocked** | `member_invites` | Revoked invites cannot be reused (policy) | `UNIQUE (tenant_id, email)` applies to all rows | Cannot re-invite same email after revoke without row delete |
| **Lead contact optional FK** | `crm_leads.contact_id` | Contact linkage | FK added in 024 but nullable with no orphan check | Stale contact references |

### 3.2 Bidirectional CRM ↔ Demand links (acceptable but fragile)

```
crm_deals.opportunity_id  ──→  opportunities
opportunities.crm_deal_id ──→  crm_deals
```

Both FKs exist (`024_crm_module.sql`) but **no constraint prevents inconsistent bidirectional state** (deal A points to opp B while opp B points to deal C). Application must maintain consistency.

### 3.3 Legacy vs module parallel paths

| Legacy path | Module path | Duplication risk |
|-------------|-------------|------------------|
| `shortlists` + `shortlist_items` | `assignment_allocations` | Two ways to plan talent for demand |
| `activity_logs` (003 trigger) | `*_audit_logs` (023–030) | Double audit streams |
| `projects.client_name` (text) | `companies.name` | Sync trigger on `company_id` set only; free-text persists |

### 3.4 Missing ON DELETE semantics

| Column | Issue |
|--------|-------|
| `payments.freelancer_id` | `REFERENCES freelancers(id)` without `ON DELETE` — defaults to `NO ACTION`; blocks freelancer hard delete |
| `milestones` → `payments` | `ON DELETE CASCADE` on payment side — deleting milestone deletes payment (may be intentional) |

---

## 4. Missing RLS policies

RLS is **enabled on all tables**, but many tables are **SELECT-only for authenticated users** with writes restricted to `service_role`. This is an architectural pattern, not an omission — but it creates risk if application code writes via user JWT instead of service role.

### 4.1 SELECT-only tables (19) — writes via service role / RPC

| Table | Context | Write path expected |
|-------|---------|---------------------|
| `domain_events` | Workflow | `emit_domain_event()` / service role |
| `workflow_runs`, `workflow_jobs` | Workflow | Cron `/api/cron/process-workflow-jobs` |
| `workflow_execution_history`, `workflow_compensations`, `workflow_audit_logs` | Workflow | Engine service role |
| `whatsapp_conversations`, `whatsapp_memory_entries`, `whatsapp_audit_logs`, `whatsapp_approval_gates` | WhatsApp | Platform module service role |
| `ai_requests`, `talent_match_scores` | AI | Gateway / match pipeline |
| `email_logs`, `webhook_deliveries` | Integration | Webhook handlers |
| `analytics_cache_snapshots` | Analytics | SECURITY DEFINER RPCs |
| `platform_log_entries`, `platform_metric_points`, `platform_trace_spans` | Platform | Observability service |

**Risk:** Any route using Supabase client with user session to INSERT into these tables will fail silently or throw at runtime. Current architecture uses server-side service role — **acceptable if enforced consistently**.

### 4.2 Zero-policy table (1)

| Table | State | Notes |
|-------|-------|-------|
| `api_idempotency_responses` | RLS enabled, **no policies**; `REVOKE ALL FROM authenticated` | Correct — service role only (`021`) |

### 4.3 Partial mutation gaps (intentional immutability)

| Table | Missing ops | Domain reason |
|-------|-------------|---------------|
| `payments` | DELETE | Financial immutability ✅ |
| `*_audit_logs` (6 tables) | UPDATE, DELETE | Append-only audit ✅ |
| `project_timeline_events`, `assignment_history` | UPDATE, DELETE | Event log ✅ |
| `whatsapp_messages` | UPDATE, DELETE | Append-only message log ✅ |
| `freelancer_rating_history` | UPDATE, DELETE | History immutable ✅ |

### 4.4 Potential RLS gaps (review recommended)

| Table | Gap | Recommendation |
|-------|-----|----------------|
| `whatsapp_audit_logs` | SELECT manager only; no freelancer visibility | Confirm policy — freelancers may need own action history |
| `agent_sessions` | No DELETE policy | Orphan sessions accumulate; add retention policy |
| `analytics_exports` | No UPDATE/DELETE for users | Expired export cleanup needs service role cron |
| `crm_pipeline_stages` | `FOR ALL` manager only | Freelancers/clients correctly excluded ✅ |
| `integration_configs` | Full CRUD for admin | Secrets in JSONB — ensure not exposed via SELECT to non-admin |

### 4.5 Client role coverage

Client RLS policies exist for:

- `companies`, `projects`, `opportunities`, `knowledge_entries`

**Missing client read policies** (may be intentional):

- `milestones`, `project_deliverables`, `payments` (client payment visibility not in RLS — only via company project link in app layer)

---

## 5. Missing constraints

Domain invariants documented in specs but **not enforced at database level**.

### 5.1 CHECK constraints

| Table | Invariant | Enforced in app | DB constraint |
|-------|-----------|-----------------|---------------|
| `assignment_allocations` | Must reference project XOR opportunity | Partial | ❌ Missing |
| `assignment_allocations` | `allocation_pct` 1–100 when active | Yes (`027`) | ✅ CHECK exists (allows 0) |
| `crm_contracts` | `signed` status requires `signed_at` | Yes (validation) | ❌ Missing |
| `crm_contracts` | `ends_on >= starts_on` | No | ❌ Missing |
| `crm_deals` | `value >= 0` | Yes (validation) | ❌ Missing |
| `companies` | Unique `(tenant_id, name)` | Partial | ❌ Only slug unique |
| `member_invites` | Pending invite unique per email | Policy | ⚠️ `UNIQUE (tenant_id, email)` too strict |
| `opportunities` | `response_deadline > created_at` | No | ❌ Missing |
| `payments` | `amount > 0` | Implicit | ❌ Missing CHECK |
| `tenant_members` | At least one admin per tenant | Yes (service) | ❌ Missing (requires trigger) |
| `workflow_definitions` | Valid JSON step schema | Yes (Zod) | ❌ JSONB unconstrained |

### 5.2 Enum drift

| Enum | Domain / app | Database | Issue |
|------|--------------|----------|-------|
| `discipline_type` | 6 values in `DISCIPLINES` constant | 6 values in `001` | ✅ Aligned |
| `user_role` | Includes `client` | Extended in `011` | ✅ Aligned |
| `project_status` | 6 statuses in module | 6 in enum | ✅ Aligned |
| Event naming | Namespaced + legacy flat | `domain_events.event_type` is free TEXT | No enum — intentional for extensibility |

### 5.3 Soft delete consistency

Soft delete (`deleted_at`) added in module migrations for most entities, but **legacy tables lack it**:

| Table | `deleted_at` |
|-------|--------------|
| `opportunities`, `opportunity_recipients` | ❌ Hard delete only |
| `shortlists`, `shortlist_items` | ❌ |
| `payments`, `notifications` | ❌ |
| `whatsapp_messages` | ❌ |
| `domain_events`, `workflow_*` | ❌ (operational tables) |

Domain model implies soft delete for opportunities and companies — companies have `deleted_at` (024); opportunities do not.

---

## 6. Duplicate data

Denormalized or parallel data stores that **duplicate information** across the schema.

### 6.1 Identity duplication

| Data | Primary source | Duplicate | Sync mechanism |
|------|----------------|-----------|----------------|
| User profile | `profiles` | `users` VIEW | View — no duplication ✅ |
| Talent profile | `freelancers` | `talent_profiles` VIEW | View — no duplication ✅ |
| Freelancer email | `freelancers.email` | `profiles.email` (when linked) | No sync trigger — can diverge when `user_id` set |
| Client name | `companies.name` | `projects.client_name`, `opportunities.client_name` | Trigger syncs project on `company_id` update only |

### 6.2 Audit / activity duplication

| Stream | Tables | Overlap |
|--------|--------|---------|
| Legacy activity | `activity_logs` | Generic `log_activity()` trigger (`003`) |
| Module audit | 7× `*_audit_logs` | Per-context immutable audit (023–030) |
| CRM activities | `crm_activities` | Business-meaningful activities (calls, meetings) |
| Project timeline | `project_timeline_events` | Delivery feed |

**Impact:** Same mutation may appear in `activity_logs` AND context audit log AND timeline. Domain model acknowledges this as technical debt.

### 6.3 Demand / allocation duplication

| Concept | Legacy | Module |
|---------|--------|--------|
| Talent shortlist | `shortlists`, `shortlist_items`, `talent_match_scores` | — |
| Resource allocation | — | `assignment_allocations`, `assignment_requirements` |
| Broadcast state | `opportunity_recipients` | Partial overlap with allocations |

Both paths active — `CONTEXT_MAP.md` flags as known tension.

### 6.4 Event duplication

| Event store | Format |
|-------------|--------|
| `domain_events` | Namespaced (`crm.lead.created`) + legacy flat (`milestone.submitted`) |
| DB triggers | Some events emitted only via triggers (`005`), not application outbox |
| `activity_logs` | Human-readable action strings |

No single canonical event stream for analytics replay.

### 6.5 Cache duplication

| Layer | Location |
|-------|----------|
| In-process | `BaseRepository.withCache()` |
| DB snapshots | `analytics_cache_snapshots` (schema ready, lightly used) |
| Materialized views | `004_views_analytics.sql` (legacy) |

Three caching layers can serve stale conflicting data if TTLs diverge.

---

## 7. Performance concerns

### 7.1 Analytics RPC load

Migration `031_analytics_module.sql` defines 8 SECURITY DEFINER RPCs that run **multiple sequential COUNT/GROUP BY scans** per dashboard request:

- `get_analytics_utilization` — joins `assignment_allocations`, `assignment_capacity`, `assignment_conflicts`
- `get_analytics_revenue` — full table scan on `payments` with date filters
- `get_analytics_workflows` — aggregates `workflow_runs`, `workflow_jobs`

**Concern:** At >10k projects / >50k allocations, dashboard RPCs will degrade despite app-layer TTL cache (60–180s).

**Recommendations (future, not migrations now):**

- Materialized views refreshed by cron
- Pre-aggregated daily snapshot tables per tenant
- Partial indexes listed in Section 2

### 7.2 Conflict detection RPC

`detect_assignment_conflicts` (`027`) performs nested scans over allocations, schedules, and availability slots per freelancer.

**Concern:** O(n²) overlap checks at scale without date-range partitioning.

### 7.3 Domain event outbox polling

```sql
CREATE INDEX idx_domain_events_pending ON domain_events(created_at)
  WHERE status = 'pending';
```

Cron polls pending events by `created_at`, but retry scheduling uses `scheduled_at` on failed events. **Failed event retry may not use optimal index.**

### 7.4 Full-text search gaps

| Feature | Index | Gap |
|---------|-------|-----|
| CRM leads | GIN on `title` | ✅ |
| Knowledge | GIN on `search_vector` | ✅ |
| Talent search | GIN on `skills`, `tags` | Name/email text search relies on sequential scan in RPC |
| Companies | None on `name` | CRM company search slow at scale |

### 7.5 JSONB column bloat

Heavy JSONB usage without GIN indexes where queried:

| Table | Column | Queried in app? |
|-------|--------|-----------------|
| `tenants.settings` | features, config | Feature flags (prefer `platform_feature_flags`) |
| `freelancers.metadata` | arbitrary | Rarely |
| `workflow_definitions.steps` | step config | Loaded by ID only ✅ |
| `ai_requests` payload | logged | Audit only ✅ |

### 7.6 Storage RLS path extraction

Storage policies use `(storage.foldername(name))[1]::uuid` for tenant scoping (`006`). **Concern:** Path parsing per object on every storage operation — acceptable at current scale.

### 7.7 Connection pool / RLS function cost

RLS policies call `SECURITY DEFINER` helpers (`user_tenant_ids()`, `is_manager_of()`) per row. **Standard Supabase pattern** — monitor with `platform_trace_spans` at high tenant counts.

---

## 8. Positive alignment notes

Items that **correctly match** the domain model:

| Area | Implementation |
|------|----------------|
| Tenant isolation | `tenant_id` on all business tables; RLS via helper functions |
| Payment ↔ milestone | `payments.milestone_id UNIQUE` — 1:1 as specified |
| Organization structure | Departments, teams, team members with slug uniqueness |
| CRM pipeline | Configurable `crm_pipeline_stages` with outcome enum |
| Project health | `compute_project_health()` RPC + cached columns on `projects` |
| Workflow saga | Compensation queue + execution history tables |
| AI ledger | `ai_requests` with token/cost tracking (extended in 029) |
| Idempotency | Outbox `UNIQUE (tenant_id, idempotency_key)` + API idempotency table |
| WhatsApp approval gates | `whatsapp_approval_gates` links to `approval_requests` |
| Analytics exports | 7-day expiry column + tenant-scoped RLS |

---

## 9. Prioritized recommendations

**No migrations in this document.** Priority order for post-approval work:

### P0 — Integrity (before scale)

1. ~~Add XOR CHECK on `assignment_allocations` (project_id OR opportunity_id, not both/neither)~~ ✅ Sprint 10 (`032`)
2. ~~Add partial unique index on `member_invites` for pending invites only~~ ✅ Sprint 10 (`032`)
3. ~~Add `conversation_id` FK chain for WhatsApp messages and memory~~ ✅ Sprint 10 (`032`)
4. ~~Add `idx_assignment_allocations_opportunity`~~ ✅ Sprint 10 (`032`)

### P1 — Performance (before 10k+ rows per tenant)

5. Composite indexes on `payments` for revenue analytics
6. `domain_events (status, scheduled_at)` partial index for retry cron
7. GIN/trigram index on `companies.name` and `freelancers` full_name search
8. Materialized views or snapshot tables for analytics dashboards

### P2 — Domain purity (technical debt)

9. Consolidate audit: deprecate `activity_logs` writes in favor of module audit tables
10. Add `deleted_at` to `opportunities` and `opportunity_recipients`
11. Add `finance_audit_logs` table when Finance REST module ships
12. Enforce `companies (tenant_id, lower(name))` uniqueness
13. Add CHECK on `crm_contracts` signed_at when status = signed

### P3 — Future enhancements

14. `notification_preferences` table
15. `payment_disputes` aggregate table
16. Partition `platform_log_entries` and `domain_events` by month
17. BRIN indexes on high-volume time-series tables

---

## 10. Appendix

### A. Migration timeline

| Range | Focus |
|-------|-------|
| `001`–`006` | Core schema, RLS, integrity triggers |
| `007`–`013` | Auth, projects, workflow fixes |
| `014`–`021` | Workflow engine, knowledge, agents, observability, idempotency |
| `022`–`023` | Platform core, organization module |
| `024`–`031` | CRM, talent, project, assignment, workflow module, WhatsApp, analytics |

### B. Table count by context

| Context | Tables |
|---------|-------:|
| Organization | 8 |
| CRM & Demand | 15 |
| Talent | 8 |
| Project | 10 |
| Assignment | 7 |
| Finance | 1 |
| Workflow | 8 |
| WhatsApp | 6 |
| AI | 8 |
| Analytics | 2 |
| Platform | 7 |
| Supporting | 4 |
| **Total** | **84** |

### C. RLS helper functions

| Function | Purpose |
|----------|---------|
| `user_tenant_ids()` | Active tenant membership |
| `manager_tenant_ids()` | Admin + talent_manager tenants |
| `admin_tenant_ids()` | Admin-only tenants |
| `freelancer_tenant_ids()` | Freelancer role tenants |
| `user_freelancer_ids()` | Freelancer profile IDs for current user |
| `client_company_ids()` | Company IDs for client role |
| `is_manager_of(uuid)` | Manager check for RLS policies |
| `is_admin_of(uuid)` | Admin check |
| `has_tenant_role(uuid, user_role[])` | Generic role check |

---

## Document status

| Item | Status |
|------|--------|
| Schema review | Complete (migrations 001–031) |
| Domain model comparison | Complete |
| Migration scripts | **P0 applied in `032_db_integrity_p0.sql` (Sprint 10)** |
| Next step | Review findings; prioritize P1–P1 for migration sprint |

**Awaiting approval before any schema changes.**
