# Repository Layer

All database access flows through repositories in `lib/repositories/`. Business logic (actions, integrations, pages) must never call Supabase directly.

## Architecture

```
Pages / API routes          →  lib/queries/*.queries.ts  (read models)
Server actions / services   →  createRepositories()
Background / webhooks / AI  →  createAdminRepositories()
                                      ↓
                              lib/repositories/*
                                      ↓
                              Supabase (via RepositoryContext)
```

## Core repositories

| Repository | Table(s) | Domain |
|---|---|---|
| `TalentRepository` | `freelancers` | Talent roster |
| `ProjectRepository` | `projects` | Projects |
| `TaskRepository` | `milestones` | Milestones / tasks |
| `LeadRepository` | `opportunities`, `opportunity_recipients` | Leads / opportunities |
| `InvoiceRepository` | `payments` | Invoices / payments |
| `CompanyRepository` | `companies` | Client companies |
| `ShortlistRepository` | `shortlists`, `shortlist_items` | Shortlists |
| `NotificationRepository` | `notifications` | Notifications |
| `ActivityLogRepository` | `activity_logs` | Audit trail |
| `DashboardRepository` | `v_dashboard_summary` | Manager dashboard |
| `TenantMemberRepository` | `tenant_members` | Membership |
| `MemberInviteRepository` | `member_invites` | Invites |
| `MatchScoreRepository` | `talent_match_scores` | AI match scores |
| `AiRequestRepository` | `ai_requests` | AI request log |
| `TenantRepository` | `tenants` | Tenant settings |
| `DomainEventRepository` | `domain_events` | Outbox / events |
| `IntegrationConfigRepository` | `integration_configs` | n8n / WhatsApp config |
| `WebhookDeliveryRepository` | `webhook_deliveries` | Webhook idempotency |
| `WhatsappMessageRepository` | `whatsapp_messages` | WhatsApp messages |

Talent portfolio/rating repos remain under `lib/domains/talent/repositories/` and are wired through the factory.

## Factory

```typescript
import { createRepositories, createAdminRepositories } from '@/lib/repositories'

// User-scoped (RLS via session client)
const repos = await createRepositories()

// Service role (cron, webhooks, AI workers)
const adminRepos = await createAdminRepositories()
```

## Base repository features

- **CRUD** — entity-specific methods on each repository
- **Pagination** — `paginate()` + `PaginatedResult` via `lib/repositories/base/types.ts`
- **Filtering** — query params on `listByTenant`, `search`, etc.
- **Errors** — `throwIfError`, `notFound`, mapped via `lib/core/supabase-errors`
- **Caching** — TTL in-memory cache via `withCache()` (e.g. dashboard summary)
- **Transactions** — RPC calls (`create_project_with_milestones`, `emit_domain_event`) encapsulated in repos

## Query layer (pages)

Read-only helpers for Server Components live in `lib/queries/`:

- `projects.queries.ts` — project list, detail, new-project form
- `opportunities.queries.ts` — opportunity list, detail, shortlist header
- `payments.queries.ts` — payment list
- `dashboard.queries.ts` — role-specific dashboard context
- `talent.queries.ts` — talent profile, search, activity
- `companies.queries.ts` — companies + shortlist assembly
- `team.queries.ts` — team members API data

Pages import from `lib/queries/*`, not repositories directly.

## Migrations completed

- All dashboard pages under `app/(dashboard)/`
- Server actions: `projects`, `opportunities`, `companies`, `milestones`, `shortlists`
- AI integrations: matching, brief-parse, summary, status-assessment, governance, fallback, executor
- Integrations: events, n8n, whatsapp
- AI token logger
- API routes: analytics dashboard, team members, webhooks, cron dispatch

## Infrastructure exceptions

Supabase clients in `modules/core/` (session, auth, tenant context, browser hooks) remain infrastructure — they establish identity and RLS context, not business data access.

## Adding a new feature

1. Add or extend a repository method in `lib/repositories/`
2. Call it from an action/service via `createRepositories()` or `createAdminRepositories()`
3. For page reads, add a function to `lib/queries/` if needed
4. Never import `createClient` or `createAdminClient` from business code outside repositories
