# TalentOS — Final Staff Engineer Audit

| Field | Value |
|-------|-------|
| **Document Version** | 1.0.0 |
| **Audit Date** | 2026-07-30 |
| **Branch Analyzed** | `cursor/documentation-hub-5fb1` (latest feature work) |
| **Scope** | Full codebase — 18 SQL migrations, ~320 TypeScript/TSX source files, 79 automated tests |
| **Classification** | Internal — Engineering Reference |
| **Method** | Static analysis, architecture review, security surface mapping, cross-reference with existing docs (`docs/24-technical-audit.md`, canonical guides) |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Scorecard](#2-scorecard)
3. [Critical Findings](#3-critical-findings)
4. [Architecture Issues](#4-architecture-issues)
5. [Security Issues](#5-security-issues)
6. [Performance Issues](#6-performance-issues)
7. [Scalability Issues](#7-scalability-issues)
8. [AI Issues](#8-ai-issues)
9. [Supabase Issues](#9-supabase-issues)
10. [Database Issues](#10-database-issues)
11. [Workflow Issues](#11-workflow-issues)
12. [Refactoring Opportunities](#12-refactoring-opportunities)
13. [Positive Findings](#13-positive-findings)
14. [Remediation Roadmap](#14-remediation-roadmap)
15. [Appendix — Evidence Index](#15-appendix--evidence-index)

---

## 1. Executive Summary

TalentOS is a **Next.js 15 monolith** on **Vercel**, backed by **Supabase** (PostgreSQL, Auth, Storage, Realtime), with an event outbox, workflow engine, AI gateway, agent framework, knowledge module, and WhatsApp integration. The codebase has matured significantly since the initial technical audit (`docs/24-technical-audit.md`): repository/service layers, Vitest CI, documentation hub, and modular migrations are in place.

**Overall verdict:** Strong MVP foundation with thoughtful multi-tenancy and event-driven design. **Not production-hardened.** Several critical issues would cause cron jobs to fail silently, allow authorization bypasses, or permit privilege escalation via database RPCs. AI and workflow subsystems have race conditions and governance gaps. Test coverage (~9%) is far below the risk surface.

### Top 5 Blockers Before Production

| # | Issue | Impact |
|---|-------|--------|
| 1 | Middleware redirects unauthenticated cron/internal/health routes to `/login` | All scheduled jobs and internal AI execution are broken in deployed environments |
| 2 | `create_tenant_with_admin` / `link_freelancer_to_user` callable by any authenticated user without `auth.uid()` check | Tenant creation and freelancer account hijacking |
| 3 | Approval resolution allows any user when `approver_id` is null | Workflow authorization bypass |
| 4 | Webhook signature verification skipped when secrets are unset | Forged webhook payloads accepted |
| 5 | AI request execution lacks optimistic locking | Duplicate LLM calls, double billing, inconsistent state |

---

## 2. Scorecard

| Dimension | Rating | Notes |
|-----------|--------|-------|
| **Architecture** | B− | Clear layering (pages → queries → services → repos → Supabase); fragmentation in talent domain and query paths |
| **Security** | C | RLS foundation solid; critical RPC and middleware gaps |
| **Performance** | C+ | Adequate for MVP load; N+1 patterns and full-table scans at scale |
| **Scalability** | C | Outbox/workflow design sound; locking, archival, and rate limits insufficient for multi-tenant growth |
| **AI Governance** | C− | Gateway exists; bypass paths, prompt sprawl, serverless rate limiter |
| **Supabase Usage** | B− | Migrations disciplined; SECURITY DEFINER hygiene and index alignment need work |
| **Database Design** | B | Normalized schema, RLS, pgvector ready; operational tables lack lifecycle management |
| **Workflow Engine** | C+ | Good registry/conditions model; step ordering, approval enforcement, delivery semantics incomplete |
| **Testing** | D+ | 79 tests pass; ~9% line coverage; no E2E or RLS integration tests |
| **Documentation** | A− | Canonical guides + auto-generated catalogs; keep in sync via CI |
| **Production Readiness** | Beta | Core flows work locally; deployed automation likely broken |

---

## 3. Critical Findings

### C-01 — Middleware Blocks Cron, Internal, and Health Routes

**Severity:** Critical  
**Category:** Security / Workflow / Deployment

`middleware.ts` requires authentication for all routes except those in `PUBLIC_ROUTES`. That list includes `/api/webhooks` but **not** `/api/cron/*`, `/api/internal/*`, or `/api/health`.

Vercel Cron invokes these routes without a Supabase session cookie. Middleware redirects to `/login` **before** route handlers can validate `Authorization: Bearer ${CRON_SECRET}`.

**Affected routes:**

- `/api/cron/dispatch-events` — domain event outbox (every minute)
- `/api/cron/process-workflow-jobs` — workflow job processor (every minute)
- `/api/cron/check-overdue-milestones` — daily overdue scan
- `/api/internal/ai/execute` — n8n AI callback
- `/api/internal/ai/execute-match` — match execution callback
- `/api/health` — health probe

**Evidence:**

```3:12:modules/core/utils/constants.ts
export const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/invite',
  '/forgot-password',
  '/api/auth/callback',
  '/api/auth/signout',
  '/api/auth/invite',
  '/api/webhooks',
] as const
```

```61:65:middleware.ts
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }
```

**Remediation:** Add `/api/cron`, `/api/internal`, and `/api/health` to public routes (or bypass auth in middleware when `Authorization: Bearer` matches `CRON_SECRET`). Prefer a dedicated `SYSTEM_ROUTES` matcher evaluated before the auth redirect.

---

### C-02 — SECURITY DEFINER RPCs Without Caller Validation

**Severity:** Critical  
**Category:** Security / Supabase

`create_tenant_with_admin` and `link_freelancer_to_user` are `SECURITY DEFINER` functions granted to the `authenticated` role. Neither validates that `p_user_id = auth.uid()`.

Any logged-in user can:

- Create unlimited tenants and assign arbitrary users as admin
- Link any unlinked freelancer record to their own user ID (account takeover)

**Evidence:**

```214:255:supabase/migrations/003_functions_triggers.sql
CREATE OR REPLACE FUNCTION create_tenant_with_admin(
  p_name TEXT,
  p_slug TEXT,
  p_user_id UUID
)
RETURNS UUID AS $$
-- ... inserts tenant + admin member for p_user_id with no auth.uid() check
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION link_freelancer_to_user(
  p_freelancer_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
-- ... links freelancer to p_user_id with no auth.uid() check
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

```799:803:supabase/migrations/006_complete_rls_and_integrity.sql
GRANT EXECUTE ON FUNCTION public.create_tenant_with_admin(TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_freelancer_to_user(UUID, UUID) TO authenticated;
```

**Remediation:** Add `IF p_user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION ...` guards, or revoke `authenticated` execute and route through server-side admin client only.

---

### C-03 — Approval Authorization Bypass When Approver Unresolved

**Severity:** Critical  
**Category:** Security / Workflow

When `resolveApprover()` returns `null` (e.g., project has no `assigned_by`), `resolveApproval()` only rejects users who **don't match** a non-null `approver_id`. A null approver means **any authenticated user** in any tenant context can approve or reject.

Additionally, `app/actions/approvals.ts` does not verify the approval belongs to the caller's active tenant.

**Evidence:**

```168:170:lib/workflows/engine.ts
    if (approval.approver_id && approval.approver_id !== userId) {
      return { ok: false, error: 'Not authorized to decide this approval' }
    }
```

```255:266:lib/workflows/engine.ts
  private async resolveApprover(...): Promise<string | null> {
    if (role === 'assigned_by' || role === 'project_manager') {
      const project = await services.project.findAssignedBy(projectId)
      return project?.assigned_by ?? null
    }
    return context.actorId
  }
```

**Remediation:** Fail closed when `approver_id` is null; enforce role-based fallback (e.g., any `talent_manager` in tenant). Add tenant membership check in both engine and server action.

---

### C-04 — Webhook Signature Verification Optional

**Severity:** Critical (when secrets unset)  
**Category:** Security

Both n8n and WhatsApp webhooks skip signature verification when environment secrets are empty strings. In dev/staging or misconfigured production, forged payloads are accepted.

**Evidence:**

```11:15:app/api/webhooks/n8n/route.ts
  const secret = process.env.N8N_WEBHOOK_SECRET ?? ''
  if (secret && !verifySignature(body, secret, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }
```

```24:28:app/api/webhooks/whatsapp/route.ts
  const appSecret = process.env.WHATSAPP_APP_SECRET ?? ''
  if (appSecret && !verifyMetaSignature(rawBody, appSecret, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }
```

**Remediation:** Fail closed in production (`NODE_ENV === 'production'` requires secrets). Reject requests when secret is configured but signature header is missing.

---

### C-05 — AI Request Double-Execution Race

**Severity:** Critical  
**Category:** AI / Workflow

AI executors check `status === 'completed'` then set `status: 'processing'` without an atomic claim (no `WHERE status = 'pending'` on update). Concurrent cron dispatches or n8n retries can execute the same request twice.

**Evidence:**

```117:126:lib/integrations/ai/matching.ts
  if (aiRequest.status === 'completed') {
    return { aiRequestId, status: 'completed' as const, skipped: true }
  }
  // ...
  await updateAiRequest(aiRequestId, { status: 'processing' })
```

Same pattern in `brief-parse.ts`, `summary.ts`, `status-assessment.ts`. The repository update has no status precondition:

```70:87:lib/repositories/ai-request.repository.ts
  async update(aiRequestId: string, patch: UpdateAiRequestInput): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('ai_requests')
      .update({ status: patch.status, ... })
      .eq('id', aiRequestId)
```

**Remediation:** Add `claimAiRequest(id)` RPC or repository method: `UPDATE ... SET status = 'processing' WHERE id = $1 AND status = 'pending' RETURNING *`.

---

## 4. Architecture Issues

### A-01 — Service Factory Not Unified Across Domains

**Severity:** High

`PortfolioService` lives in `lib/domains/talent/` but is **not** registered in `lib/services/factory.ts`. Callers instantiate it ad hoc via `createTalentServices()` or inline in `lib/talent/queries.ts`, creating duplicate repository contexts per request.

**Evidence:** `lib/domains/talent/factory.ts`, `lib/talent/queries.ts` vs `lib/services/factory.ts`

**Impact:** Inconsistent DI, harder testing, duplicate Supabase client creation.

---

### A-02 — Duplicate Talent Domain Implementations

**Severity:** High

Talent logic exists in three places:

| Location | Purpose |
|----------|---------|
| `lib/services/talent.service.ts` | Main service layer |
| `lib/domains/talent/` | Partial refactor (portfolio, freelancer repo) |
| `lib/talent/queries.ts` | Legacy query entry points |

**Impact:** Divergent behavior risk, unclear canonical path for new features (including marketplace).

---

### A-03 — Query Layer Fragmentation

**Severity:** Medium

Canonical queries live in `lib/queries/` (projects, opportunities, talent, etc.) but talent also has `lib/talent/queries.ts`. Pages and actions import from both inconsistently.

---

### A-04 — Circular Service Dependencies via Factory

**Severity:** Medium

`buildServices()` uses a lazy `let services!` pattern to break the cycle:

```
IntegrationService → CRMService, AIService
WhatsAppService → IntegrationService, CRMService, TalentService, WorkflowService, ProjectService
WorkflowEngineService → Services (full graph)
```

**Evidence:** `lib/services/factory.ts:50-68`

**Impact:** Hidden coupling, difficult to extract microservices or test in isolation.

---

### A-05 — MCP Gateway Is a Stub

**Severity:** Medium

`McpGateway.invoke()` performs authorization then returns `"Tool adapter not implemented"` for all tools. Agent framework references MCP tools but runtime execution is non-functional.

**Evidence:** `lib/mcp/gateway.ts:51-59`

---

### A-06 — Marketplace Is Architecture-Only

**Severity:** Low (expected)

Migration blueprint (`018_marketplace_architecture.sql`), types, and boundaries exist. No services, repositories, or UI. Risk of schema drift if implementation diverges from blueprint.

---

### A-07 — Legacy and Direct AI Execution Paths Coexist

**Severity:** Medium

Three AI execution paths operate in parallel:

1. n8n webhook dispatch (default)
2. Direct mode via `AI_EXECUTION_MODE=direct` in cron
3. Workflow action `execute_ai`

**Evidence:** `app/api/cron/dispatch-events/route.ts`, `lib/workflows/actions.ts:57-76`

**Impact:** Operational confusion, duplicated dispatch logic, inconsistent error handling.

---

## 5. Security Issues

| ID | Severity | Issue | Location |
|----|----------|-------|----------|
| S-01 | Critical | Middleware blocks system routes | See C-01 |
| S-02 | Critical | Unrestricted SECURITY DEFINER RPCs | See C-02 |
| S-03 | Critical | Approval bypass | See C-03 |
| S-04 | Critical | Optional webhook signatures | See C-04 |
| S-05 | High | Single shared `CRON_SECRET` for cron + internal AI routes | All `/api/cron/*`, `/api/internal/*` |
| S-06 | High | Integration secrets stored as plaintext JSON in `integration_configs.config` | `lib/repositories/integration.repository.ts`; `encryptJson()` exists but unused |
| S-07 | High | Agent instruction content readable by any tenant manager via RLS | `agent_instruction_versions` policy allows `tenant_id IS NULL` global rows |
| S-08 | High | SECURITY DEFINER search RPCs accept arbitrary `p_tenant_id` | `search_knowledge_entries`, `search_knowledge_vector`, `search_freelancers` — no membership check inside function |
| S-09 | Medium | Admin service role bypasses RLS; tenant scoping relies on application discipline | `createAdminRepositories()` used widely |
| S-10 | Medium | `domain_events` published to Supabase Realtime | Potential cross-tenant leak if client subscribes without strict filters |
| S-11 | Medium | No CSRF token on server actions (rely on SameSite cookies only) | Standard Next.js pattern; document threat model |
| S-12 | Low | WhatsApp verify token compared in plaintext | `app/api/webhooks/whatsapp/route.ts:14` |

---

## 6. Performance Issues

| ID | Severity | Issue | Location |
|----|----------|-------|----------|
| P-01 | High | `resolveTenantByWhatsAppPhoneNumberId` loads all active WhatsApp configs and scans in JS | `lib/repositories/integration.repository.ts:32-46` |
| P-02 | High | `processOverdueMilestones` N+1: per milestone queries for project, event, notification | `lib/integrations/ai/status-assessment.ts:229-278` |
| P-03 | Medium | Full service graph constructed per request via `createServices()` | Every server action / API route |
| P-04 | Medium | `createAdminServices()` invoked multiple times per workflow step | `lib/integrations/events.ts`, AI executors |
| P-05 | Medium | Outbox partial index misaligned with poll query | See D-01 |
| P-06 | Low | In-memory AI cost tracker and rate limiter reset on cold start | `lib/ai/logging/cost-tracker.ts`, `lib/ai/middleware/rate-limit.ts` |
| P-07 | Low | No pagination cap enforcement on some list endpoints | Various query layers |

---

## 7. Scalability Issues

| ID | Severity | Issue | Impact |
|----|----------|-------|--------|
| SC-01 | High | Cron throughput ~100 events/min (50 dispatch + 50 jobs, both every minute) | Backlog growth under load |
| SC-02 | High | No horizontal job locking (`FOR UPDATE SKIP LOCKED`) | Duplicate processing across Vercel instances |
| SC-03 | High | In-memory rate limiter ineffective on serverless | Per-instance limits, not global |
| SC-04 | Medium | No archival/purge for `domain_events`, `workflow_jobs`, `webhook_deliveries` | Unbounded table growth |
| SC-05 | Medium | Vector embedding pipeline has schema but no worker | `knowledge_embeddings.embedding` stays NULL at scale |
| SC-06 | Medium | Single-region Vercel + Supabase; no read replicas | Latency for global tenants |
| SC-07 | Low | `webhook_deliveries` purging documented but not implemented | Comment in `005_event_infrastructure.sql:60-61` |

---

## 8. AI Issues

| ID | Severity | Issue | Location |
|----|----------|-------|----------|
| AI-01 | Critical | Double-execution race | See C-05 |
| AI-02 | High | `digest` feature bypasses tenant governance and monthly limits | `lib/ai/features/flags.ts:9` |
| AI-03 | High | Inline system prompts bypass PromptManager | `lib/services/whatsapp.service.ts:164-171` |
| AI-04 | High | User-controlled content injected into LLM prompts without sanitization | Opportunity descriptions, WhatsApp bodies, milestone notes in matching/PM prompts |
| AI-05 | Medium | Legacy `lib/integrations/ai/openai.ts` parallel to gateway | Two prompt/build paths |
| AI-06 | Medium | `callOpenAiStructured` still used in status assessment | `lib/integrations/ai/status-assessment.ts:9` |
| AI-07 | Medium | Token logging optional; cost tracking in-process only | `lib/ai/gateway.ts` |
| AI-08 | Medium | No embedding generation worker despite chunk preparation | `lib/services/knowledge.service.ts` |
| AI-09 | Low | Agent framework complete but MCP tools not wired | `lib/mcp/gateway.ts` |
| AI-10 | Low | Global agent instructions (`tenant_id IS NULL`) — cross-tenant prompt visibility for managers | `017_agents_module.sql` RLS |

---

## 9. Supabase Issues

| ID | Severity | Issue | Details |
|----|----------|-------|---------|
| SB-01 | Critical | SECURITY DEFINER RPC privilege escalation | See C-02 |
| SB-02 | High | SECURITY DEFINER search functions trust caller-supplied `p_tenant_id` | Knowledge, talent search RPCs |
| SB-03 | High | Realtime publication includes sensitive tables | `domain_events`, `payments`, `talent_match_scores`, `projects`, `milestones` |
| SB-04 | Medium | Admin client used for most background jobs — bypasses RLS audit trail | Architectural choice; needs strict tenant filters |
| SB-05 | Medium | `search_knowledge_*` functions REVOKE from PUBLIC but no explicit GRANT documented | Works via user JWT today if default privileges apply; verify per environment |
| SB-06 | Medium | pgvector extension enabled; HNSW index created without maintenance strategy | `016_knowledge_module.sql` |
| SB-07 | Low | 18 sequential migrations; no down migrations | Standard for Supabase; document rollback procedures |

---

## 10. Database Issues

| ID | Severity | Issue | Details |
|----|----------|-------|---------|
| D-01 | High | Outbox index/query mismatch | Index: `idx_domain_events_pending ON (created_at) WHERE status = 'pending'`. Query: `status IN ('pending','failed')` ordered by `created_at`, filtered by `scheduled_at` — partial index excludes `failed`, no index on `scheduled_at` |
| D-02 | High | No optimistic locking on event claim | `markEventProcessing` uses `eq status pending` but list and mark are not atomic |
| D-03 | Medium | `approval_requests.expires_at` stored but never enforced | `lib/workflows/engine.ts` `resolveApproval` |
| D-04 | Medium | Workflow jobs for all steps inserted simultaneously | `enqueueSteps` loop inserts all non-approval jobs as pending at once |
| D-05 | Medium | `integration_configs` for WhatsApp lacks indexed lookup on `phone_number_id` | JSON field scan |
| D-06 | Low | Generated `search_vector` on knowledge uses English only | Non-English content degraded |
| D-07 | Low | Missing composite index for common admin queries on `ai_requests(tenant_id, request_type, created_at)` | Monthly count query |

---

## 11. Workflow Issues

| ID | Severity | Issue | Details |
|----|----------|-------|---------|
| W-01 | Critical | Cron routes unreachable | See C-01 |
| W-02 | Critical | Approval authorization gap | See C-03 |
| W-03 | High | Events marked `delivered` before workflow jobs finish | `dispatch-events/route.ts:94` marks delivered after trigger, not after job completion |
| W-04 | High | No step sequencing — parallel job execution | `enqueueSteps` creates all action jobs as pending; `advanceRun` only checks pending count |
| W-05 | High | Duplicate event processing possible | No claim token; two cron invocations can process same event |
| W-06 | Medium | `request_approval` jobs marked completed immediately; approval gate created synchronously in enqueue | `lib/workflows/engine.ts:98-100, 223-229` |
| W-07 | Medium | Failed workflow jobs retry with exponential backoff but no dead-letter alerting | `workflow.repository.ts:132-156` |
| W-08 | Medium | n8n and native workflow engine dual dispatch | Operational complexity |
| W-09 | Low | `listPendingApprovals` only returns approvals where `approver_id = userId` | Misses role-based approvals when approver unresolved |

---

## 12. Refactoring Opportunities

### Priority 1 — Consolidate Before Feature Growth

1. **Unify talent domain** — Merge `lib/domains/talent/` into `lib/services/` or vice versa; single factory entry point including `PortfolioService`.
2. **Single query layer** — Deprecate `lib/talent/queries.ts`; route all reads through `lib/queries/`.
3. **System route middleware** — Extract auth bypass for cron/internal/health into tested utility.
4. **Atomic claim helpers** — Shared repository pattern for outbox events, workflow jobs, and AI requests.

### Priority 2 — Reduce Coupling

5. **Event bus interface** — Decouple `IntegrationService` from direct `AIService` calls; use domain events only.
6. **Wire MCP adapters** — Connect `McpGateway` to existing services; enable agent tool execution.
7. **Centralize prompts** — Migrate WhatsApp inline prompt to `PromptManager`; remove duplicate OpenAI client paths.
8. **Encrypt integration configs** — Use existing `encryptJson()` for secrets at rest.

### Priority 3 — Operational Hardening

9. **Archival jobs** — Purge `webhook_deliveries` (>72h), archive `domain_events` / `workflow_jobs` (>30d).
10. **Observability** — Structured logging, correlation IDs in cron responses, dead-letter dashboards.
11. **Test expansion** — RLS policy tests, middleware route tests, workflow integration tests, AI claim race tests.

### Priority 4 — Marketplace Implementation

12. Implement marketplace services against `018_marketplace_architecture.sql` blueprint using established repo/service patterns.

---

## 13. Positive Findings

The codebase demonstrates several strong engineering choices worth preserving:

1. **Multi-tenancy** — RLS policies, tenant cookie, middleware RBAC, `requireTenant()` guards.
2. **Layered architecture** — Consistent pages → queries → services → repositories → Supabase flow documented and mostly followed.
3. **Event outbox** — Transactional `emit_domain_event` RPC with idempotency keys and correlation IDs.
4. **AI gateway** — Provider fallback, retry, structured output, prompt registry, token logging hooks.
5. **Agent framework** — Instructions server-side only; tool filtering by role; memory scopes designed.
6. **Knowledge module** — Full-text search now; pgvector/HNSW prepared for embeddings.
7. **Documentation hub** — 13 canonical guides + `npm run docs:check` in CI prevents drift.
8. **Testing foundation** — Vitest with unit/repository/service/workflow/integration tiers (79 tests passing).
9. **Migration discipline** — 18 numbered, dependency-commented SQL migrations.
10. **Webhook idempotency** — `webhook_deliveries` unique constraint on `(source, idempotency_key)`.

---

## 14. Remediation Roadmap

### Phase 0 — Immediate (Block Release)

| Item | Finding | Effort |
|------|---------|--------|
| Exempt system routes from auth middleware | C-01 | Small |
| Add `auth.uid()` checks to tenant/freelancer RPCs | C-02 | Small |
| Fail closed on null approver; add tenant check | C-03 | Small |
| Require webhook secrets in production | C-04 | Small |
| Atomic AI request claim | C-05 | Medium |

### Phase 1 — Pre-Scale (1–2 sprints)

| Item | Finding | Effort |
|------|---------|--------|
| Encrypt integration config secrets | S-06 | Medium |
| Fix outbox index + atomic event claim | D-01, D-02, W-05 | Medium |
| Sequential workflow step execution | W-04 | Medium |
| Defer `delivered` status until jobs complete | W-03 | Medium |
| Enforce approval expiration | D-03 | Small |
| Replace WhatsApp tenant scan with indexed lookup | P-01, D-05 | Medium |
| Migrate inline prompts to PromptManager | AI-03 | Small |
| Remove `digest` governance bypass | AI-02 | Small |

### Phase 2 — Hardening

| Item | Finding | Effort |
|------|---------|--------|
| Consolidate talent domain | A-01, A-02 | Large |
| Wire MCP tool adapters | A-05, AI-09 | Large |
| Distributed rate limiting (Redis/Upstash) | SC-03, P-06 | Medium |
| Archival/purge cron jobs | SC-04, SC-07 | Medium |
| Embedding generation worker | SC-05, AI-08 | Large |
| Expand test coverage to 40%+ on services/workflows | Scorecard | Large |
| Review Realtime publication surface | SB-03, S-10 | Medium |

### Phase 3 — Growth

| Item | Finding | Effort |
|------|---------|--------|
| Marketplace implementation | A-06 | Large |
| Single AI execution path | A-07 | Medium |
| Read replica / edge caching strategy | SC-06 | Large |

---

## 15. Appendix — Evidence Index

### Key Files Reviewed

| Area | Files |
|------|-------|
| Auth / Middleware | `middleware.ts`, `modules/core/utils/constants.ts`, `modules/core/api/auth.actions.ts` |
| Services | `lib/services/factory.ts`, `lib/services/*.service.ts` |
| Repositories | `lib/repositories/factory.ts`, `lib/repositories/*.repository.ts` |
| Workflow | `lib/workflows/engine.ts`, `lib/workflows/actions.ts`, `lib/workflows/registry.ts` |
| AI | `lib/ai/gateway.ts`, `lib/integrations/ai/*.ts`, `lib/ai/features/flags.ts` |
| Agents / MCP | `lib/mcp/gateway.ts`, `lib/ai/agent/*`, `supabase/migrations/017_agents_module.sql` |
| Knowledge | `lib/services/knowledge.service.ts`, `supabase/migrations/016_knowledge_module.sql` |
| Webhooks / Cron | `app/api/webhooks/*`, `app/api/cron/*`, `app/api/internal/*`, `vercel.json` |
| Database | `supabase/migrations/001–018` |
| CI | `.github/workflows/ci.yml`, `vitest.config.ts` |
| Docs | `docs/*`, `docs/24-technical-audit.md` |

### Test & Coverage Snapshot

| Metric | Value |
|--------|-------|
| Test files | 7 |
| Tests passing | 79 / 79 |
| Line coverage | ~9.3% (273 / 2942) |
| CI checks | typecheck, lint, test:coverage, docs:check |

### Migration Inventory

| # | Migration | Domain |
|---|-----------|--------|
| 001–004 | Initial schema, RLS, functions, views | Core |
| 005 | Event infrastructure | Outbox, AI requests |
| 006 | Complete RLS | Policy hardening |
| 007–013 | Auth invites, projects, talent portfolio, companies | Features |
| 014 | Workflow engine | Jobs, approvals |
| 015 | WhatsApp conversations | Messaging |
| 016 | Knowledge module | pgvector, FTS |
| 017 | Agent framework | Config, memory, sessions |
| 018 | Marketplace architecture | Blueprint only |

---

*This audit is a point-in-time static review. No code changes were made. Re-run after Phase 0 remediation before production deployment.*
