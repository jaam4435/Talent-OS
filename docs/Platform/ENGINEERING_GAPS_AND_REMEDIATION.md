# Talent OS — Engineering Gaps, Observations & Remediation Backlog

**Document type:** Supplement to Enterprise Readiness Review  
**Date:** July 30, 2026  
**Companion doc:** [ENTERPRISE_READINESS_REVIEW.md](./ENTERPRISE_READINESS_REVIEW.md)  
**Status:** Review only — no implementation. Awaiting approval.

This document captures **granular observations, gaps, and fix items** gathered across prior engineering work (agent framework, API standardization, platform observability, security/performance review, and technical audit). Items here may overlap the main readiness report but include **file-level detail and work-stream context** needed for remediation planning.

---

## Table of Contents

1. [Unmerged Work & Branch Inventory](#1-unmerged-work--branch-inventory)
2. [Build & Deploy Blockers](#2-build--deploy-blockers)
3. [Agent Framework Gaps](#3-agent-framework-gaps)
4. [API Standardization Gaps](#4-api-standardization-gaps)
5. [Platform Observability Gaps](#5-platform-observability-gaps)
6. [MCP Infrastructure Gaps](#6-mcp-infrastructure-gaps)
7. [AI Platform Gaps](#7-ai-platform-gaps)
8. [WhatsApp Integration Gaps](#8-whatsapp-integration-gaps)
9. [Marketplace Gaps](#9-marketplace-gaps)
10. [Security Fixes Required](#10-security-fixes-required)
11. [Performance Fixes Required](#11-performance-fixes-required)
12. [Database & RLS Fixes](#12-database--rls-fixes)
13. [Reliability & Event Pipeline Fixes](#13-reliability--event-pipeline-fixes)
14. [UI & Product Completeness Gaps](#14-ui--product-completeness-gaps)
15. [Missing Features (Vision vs Code)](#15-missing-features-vision-vs-code)
16. [Documentation Drift Register](#16-documentation-drift-register)
17. [Deprecated Code to Remove or Migrate](#17-deprecated-code-to-remove-or-migrate)
18. [Testing & CI Gaps](#18-testing--ci-gaps)
19. [Developer Experience Fixes](#19-developer-experience-fixes)
20. [Prioritized Fix Backlog (Action Items)](#20-prioritized-fix-backlog-action-items)

---

## 1. Unmerged Work & Branch Inventory

Feature work exists on branches that are **not merged to `main`**. Production readiness requires consolidating these before GA.

| Branch | PR (if known) | What it contains | Merge risk |
|--------|-----------------|------------------|------------|
| `cursor/agent-framework-5fb1` | #24 | 7 agents, reasoning engine, executor, `agent_messages`, Support agent | Medium — depends on MCP |
| `cursor/api-standardization-5fb1` | #38 | `withApiHandler`, errors, rate limit, idempotency, OpenAPI, SDK client | **High — build blocker** |
| `cursor/platform-observability-5fb1` | #39 | Logs, metrics, traces, alerts, instrumentation, migration 019 | Low-Medium |
| `cursor/testing-improvements-5fb1` | — | Vitest setup + initial tests | Should merge early |
| `cursor/marketplace-architecture-5fb1` | — | Marketplace architecture (not on current stack) | Unknown |
| `cursor/marketplace-platform-5fb1` | — | Marketplace platform work (not on current stack) | Unknown |
| `cursor/final-audit-5fb1` | — | Prior audit artifacts | Docs only |
| `cursor/enterprise-readiness-report-5fb1` | #40 | Enterprise readiness + this document | Docs only |

**Observation:** Two documentation tracks remain unmerged — sprint docs on `main` vs enterprise PRD on `cursor/talentos-prd-documentation-5fb1` (per `docs/24-technical-audit.md`).

**Fix:** Define a merge order: API standardization (after build fix) → observability → agent framework → testing → evaluate marketplace branches separately.

---

## 2. Build & Deploy Blockers

### B-001 — Production build fails (Critical)

```
app/api/ai/match/[opportunityId]/route.ts
Type error: RouteContext | undefined is not valid — Expected RouteContext
```

**Root cause:** `withApiHandler` declares optional second arg `routeCtx?: RouteContext` in `modules/core/api/handler.ts:59`, but Next.js 15 requires a non-optional `RouteContext` for dynamic routes.

**Note:** `npm run typecheck` may pass while `npm run build` fails — CI must run **build**, not typecheck alone.

**Fix:** Overload or export a Next.js-compatible handler signature that always accepts `RouteContext`.

---

### B-002 — Edge Runtime warning during build

Build emits warning: `@supabase/supabase-js` uses `process.version` in Edge Runtime (import trace through `@supabase/ssr`).

**Impact:** Potential runtime issues if middleware or edge routes import incompatible modules.

**Fix:** Audit edge vs Node runtime boundaries; ensure admin/service-role clients are Node-only.

---

### B-003 — No startup env validation

Missing required production secrets (`CRON_SECRET`, webhook secrets, `ENCRYPTION_KEY`) are not validated at boot.

**Fix:** Add Zod-based env schema; fail fast in production when secrets missing.

---

### B-004 — Schema push script out of date

`scripts/push-supabase-schema.sh` comment references migrations 001–011; repo has **019**.

**Fix:** Update script comments and verify push procedure documents all migrations.

---

## 3. Agent Framework Gaps

**Reference:** `docs/Platform/AGENT_FRAMEWORK_ARCHITECTURE.md`, PR #24

### Implemented

- 7 built-in agents in `lib/ai/agent/registry.ts`
- Six configurable dimensions: Instructions, Tools, Permissions, Memory, Reasoning, Conversation State
- `AgentReasoningEngine` tool-use loop in `lib/ai/agent/reasoning.ts`
- `AgentExecutor` + `AgentConversationManager`
- `AgentService.run()` in `lib/services/agent.service.ts`
- Server actions in `app/actions/agents.ts`
- Migrations `017_agents_module.sql`, `018_agent_framework_extend.sql`
- Instruction content server-side only (no prompts in UI components) ✅

### Gaps — must fix

| ID | Gap | Location | Fix |
|----|-----|----------|-----|
| AF-001 | **Tool-use non-functional** — MCP returns stub errors | `lib/mcp/gateway.ts:51-58`, `lib/ai/agent/reasoning.ts` | Implement MCP adapters |
| AF-002 | **No agent settings UI** — actions revalidate missing page | `app/actions/agents.ts:19,33` → missing `app/(dashboard)/settings/agents/` | Build settings page |
| AF-003 | **WhatsApp agent bypasses framework** — raw gateway completion | `lib/services/whatsapp.service.ts` (`runAgentQuery`) | Route through `AgentService.run()` |
| AF-004 | **Agent queries unused in UI** | `lib/queries/agents.queries.ts` | Wire to settings/dashboard |
| AF-005 | **Streaming handler not connected** | `lib/ai/streaming/handler.ts` | Add SSE route or remove dead export |
| AF-006 | **Dual AI paths** — legacy executors parallel to agent framework | `lib/integrations/ai/*` vs `lib/ai/agent/*` | Consolidation plan |
| AF-007 | **No agent run observability** | `lib/ai/agent/reasoning.ts`, executor | Add spans/metrics per agent step |
| AF-008 | **MCP/agent failures silent to user** — tool errors returned as content | `lib/mcp/gateway.ts` | Surface actionable errors in agent UI |

### Dependency chain

```
Agent UI (missing) → AgentService.run() → AgentExecutor → AgentReasoningEngine
                                                              ├── AiGateway ✅
                                                              └── McpGateway ❌ (stubs)
```

Until **AF-001** is fixed, the agent framework cannot deliver tool-use value in production.

---

## 4. API Standardization Gaps

**Reference:** `docs/Platform/API_STANDARDIZATION.md`, PR #38

### Implemented

- Platform modules under `modules/core/api/` (errors, auth, validation, pagination, rate limit, idempotency, handler)
- ~21 of 24 route handlers migrated to `withApiHandler`
- Middleware returns JSON 401/403 for API routes
- OpenAPI at `docs/openapi.yaml` + `GET /api/openapi`
- SDK client at `lib/api/client.ts`
- Server action adapter preserves `{ ok: true/false }` contract

### Routes NOT using `withApiHandler`

| Route | Issue |
|-------|-------|
| `app/api/webhooks/whatsapp/route.ts` | Manual handler — no rate limit, no standard instrumentation |
| `app/api/auth/callback/route.ts` | Manual handler — acceptable for OAuth flow |
| `app/api/auth/signout/route.ts` | Manual handler — no rate limit |

### Gaps — must fix

| ID | Gap | Location | Fix |
|----|-----|----------|-----|
| API-001 | **Build failure** on dynamic routes | `modules/core/api/handler.ts:59` | See B-001 |
| API-002 | **In-memory rate limits** — per-process only | `modules/core/api/rate-limit.ts` | Redis/Upstash |
| API-003 | **In-memory idempotency** — only on one route | `app/api/ai/match/route.ts` only has `idempotency: true` | DB/Redis store; extend to other mutations |
| API-004 | **Server Actions lack rate limit/idempotency** | `app/actions/*.ts` (13 modules) | Apply action adapter guards or document exemption |
| API-005 | **OpenAPI incomplete** — missing observability + cron routes | `docs/openapi.yaml` | Add 5 routes |
| API-006 | **Analytics API under-protected** | `app/api/analytics/dashboard/route.ts` — `auth: 'tenant'` only | Add `auth: 'manager'` + `analytics:read` |
| API-007 | **Documented REST endpoints missing** | `docs/05-api-architecture.md` | See section 15; build public API or update docs |
| API-008 | **n8n idempotency key unstable** | `app/api/webhooks/n8n/route.ts:11-12` — falls back to `Date.now()` | Require caller-provided key |
| API-009 | **Pagination not applied consistently** | Most list endpoints are actions, not REST | Standardize when building public API |
| API-010 | **Internal routes bypass session middleware** | `API_PUBLIC_ROUTES` includes `/api/internal/*` | Ensure `CRON_SECRET` always set in prod |

### Rate limit categories (current — in-memory)

| Category | Limit/min | File |
|----------|-----------|------|
| default | 120 | `modules/core/api/rate-limit.ts` |
| auth | 10 | |
| ai | 30 | |
| search | 60 | |
| webhook | 300 | |
| cron | 10 | |

Also: separate AI gateway rate limit at `lib/ai/middleware/rate-limit.ts` (default 60 RPM per tenant).

---

## 5. Platform Observability Gaps

**Reference:** `docs/Platform/OBSERVABILITY_ARCHITECTURE.md`, PR #39

### Implemented

- Core module: `lib/observability/` (logger, metrics, tracing, collector, alerts, instrumentation)
- Migration `019_platform_observability.sql` — logs, metrics, spans, alerts + SQL views
- APIs: `/api/observability/{dashboard,alerts,logs,traces/[correlationId]}`
- Cron: `/api/cron/evaluate-alerts` (every 5 min in `vercel.json`)
- Wired: `withApiHandler`, AI gateway, cron queue processing

### Gaps — must fix

| ID | Gap | Location | Fix |
|----|-----|----------|-----|
| OBS-001 | **`instrumentWorkflowRun` never called** | Defined in `lib/observability/instrumentation.ts:75` — zero usages | Wire in `lib/workflows/engine.ts` |
| OBS-002 | **`instrumentNotification` never called** | `instrumentation.ts:113` — zero usages | Wire in notification service/actions |
| OBS-003 | **No observability dashboard UI** | API only; `app/(dashboard)/analytics/page.tsx` is placeholder | Build ops dashboard page |
| OBS-004 | **WhatsApp pipeline not instrumented** | `lib/services/whatsapp.service.ts`, webhook route | Add spans + failure metrics |
| OBS-005 | **MCP/agent runs not instrumented** | `lib/mcp/gateway.ts`, `lib/ai/agent/reasoning.ts` | Add per-tool-call metrics |
| OBS-006 | **Collector flush failures logged to console only** | `lib/observability/collector.ts:61` | Retry + alert on flush failure |
| OBS-007 | **No external exporters** | Planned in docs lines 192–195 | OTel, Prometheus, Sentry |
| OBS-008 | **No `/metrics` endpoint** | Not in `app/api/` | Add Prometheus scrape route |
| OBS-009 | **Observability views grant SELECT to authenticated** | `019_platform_observability.sql:240-244` | Tenant-scope views or restrict grants |
| OBS-010 | **Alert delivery outbound not implemented** | `docs/Platform/OBSERVABILITY_ARCHITECTURE.md` — Slack/webhook planned | Wire alert notifications |
| OBS-011 | **OpenAPI missing observability routes** | `docs/openapi.yaml` | Document manager-only APIs |

### Alert rules defined (evaluator exists)

| Rule ID | Severity | Threshold |
|---------|----------|-----------|
| `outbox_pending_high` | warning | 100 pending events |
| `dead_letter_threshold` | critical | 10 dead letters |
| `workflow_failures_spike` | warning | 5 failed runs / 24h |
| `ai_cost_budget` | warning | 80% monthly limit |
| `queue_stale` | critical | 30 min oldest pending |
| `ai_failures_spike` | warning | 10 failed AI / 24h |

Alerts persist to DB but **no outbound notification channel** is wired.

---

## 6. MCP Infrastructure Gaps

**Reference:** `docs/28-mcp-architecture.md`

### Implemented

- 10 MCP servers, ~96 tool schemas in `lib/mcp/servers/*.server.ts`
- Gateway with RBAC authorization in `lib/mcp/gateway.ts`
- Agent tool filtering in `lib/ai/agent/tool-filter.ts`
- Type interfaces for transport, audit, rate limit in `lib/mcp/interfaces.ts`

### Gaps — must fix

| ID | Gap | Location | Fix |
|----|-----|----------|-----|
| MCP-001 | **All tool invocations return stub** | `lib/mcp/gateway.ts:51-58` | Implement `lib/mcp/adapters/` per domain |
| MCP-002 | **No `callTool` on server definitions** | `lib/mcp/types.ts:134` — "future server adapters" | Wire adapters to services/repos |
| MCP-003 | **No MCP transport** | `McpTransportInterface` — no stdio/HTTP/SSE impl | Required for external MCP clients |
| MCP-004 | **No MCP HTTP API route** | No `app/api/mcp/**` | Add if exposing MCP externally |
| MCP-005 | **Middleware interfaces unused** | Audit logger, rate limiter, context validator | Implement or remove |
| MCP-006 | **No MCP observability** | Gateway invoke path | Log tool name, latency, errors |

### Suggested adapter priority

1. `talent` — search, profile read
2. `projects` — status, milestones
3. `crm` — companies, clients
4. `workflow` — run status, approvals
5. `knowledge` — search (text until vectors exist)

---

## 7. AI Platform Gaps

### Implemented

- Multi-provider gateway: OpenAI, Anthropic, Gemini, OpenRouter (`lib/ai/gateway.ts`)
- Retry, fallback, per-tenant rate limit, cost logging to `ai_requests`
- Prompt manager + feature flags
- Legacy executors: match, brief parse, summaries, status assessment
- AI PM route at `/api/ai/pm/[entityType]/[entityId]`

### Gaps — must fix

| ID | Gap | Location | Fix |
|----|-----|----------|-----|
| AI-001 | **No vector / embedding pipeline** | `016_knowledge_module.sql`, `knowledge.service.ts:142-185` | pgvector + embedding job |
| AI-002 | **Knowledge vector search stub** | `lib/repositories/knowledge-embedding.repository.ts:127` | Requires query embedding |
| AI-003 | **Talent match sends up to 50 profiles in one prompt** | `lib/integrations/ai/openai.ts`, `talent.repository.ts` | Pre-filter + retrieval |
| AI-004 | **Synchronous AI in cron when `AI_EXECUTION_MODE=direct`** | `app/api/cron/dispatch-events/route.ts` | Always async |
| AI-005 | **Deprecated OpenAI wrappers still present** | `lib/integrations/ai/openai-client.ts` | Migrate callers, remove |
| AI-006 | **Hand-maintained `database.ts`** | `modules/core/types/database.ts` | `supabase gen types` in CI |
| AI-007 | **Streaming exported but unused** | `lib/ai/streaming/handler.ts` | Wire or remove |
| AI-008 | **AI without semantic search** | Entire talent matching | Embeddings + pgvector |
| AI-009 | **Separate in-memory AI rate limit** | `lib/ai/middleware/rate-limit.ts` | Unify with API rate limit store |

---

## 8. WhatsApp Integration Gaps

**Reference:** `docs/32-whatsapp-interface.md`, `docs/12-whatsapp-n8n-integration-architecture.md`

### Implemented

- Meta webhook verify + ingest (`app/api/webhooks/whatsapp/route.ts`)
- HMAC on raw body, DB idempotency via `webhook_deliveries`
- 7 keyword intents in `lib/whatsapp/intents.ts`
- Handlers in `lib/whatsapp/handlers.ts`
- Conversation state (migration 015)
- n8n workflow JSON files in `n8n/`
- Integration settings UI at `settings/integrations`

### Gaps — must fix

| ID | Gap | Location | Fix |
|----|-----|----------|-----|
| WA-001 | **No outbound send from app** — n8n only | By design; no `sendWhatsApp*` in `lib/` | Document SLA; optional direct API client |
| WA-002 | **Webhook bypasses `withApiHandler`** | `app/api/webhooks/whatsapp/route.ts` | Wrap or add rate limit + instrumentation |
| WA-003 | **HMAC skipped when secret unset** | Line 27: `if (appSecret && !verify...)` | Fail closed in production |
| WA-004 | **Duplicate inbound returns early — skips rest of batch** | Lines 56-58: `return` on duplicate | `continue` instead of `return` |
| WA-005 | **No webhook rate limiting** | WhatsApp route | Add rate limit category |
| WA-006 | **Rule-based intents only — no NLU** | `lib/whatsapp/intents.ts` | Embeddings or intent classifier |
| WA-007 | **Agent path is simple LLM, not agent framework** | `whatsapp.service.ts` `runAgentQuery` | Use `AgentService.run()` |
| WA-008 | **Missing test endpoint** | Docs reference `POST /api/integrations/whatsapp/test` | Implement or remove from docs |
| WA-009 | **Deprecated shim** | `lib/integrations/whatsapp.ts` | Remove after migration |
| WA-010 | **Legacy intents file** | `lib/whatsapp/intents-legacy.ts` | Remove if unused |
| WA-011 | **n8n dependency — flows fail silently if n8n down** | `docs/24-technical-audit.md` | Health checks + dead letter + retry |
| WA-012 | **Missing phone index** | `freelancers` table | `idx_freelancers_tenant_phone` |
| WA-013 | **WhatsApp consent tracking incomplete** | Audit notes STOP/START missing vs opt_out handler | Align consent model with compliance |

---

## 9. Marketplace Gaps

**On current branch stack:** Marketplace is **not implemented** (`docs/26-business-domains-refactor.md` line 40).

**Separate branches exist** (not merged):

- `cursor/marketplace-architecture-5fb1`
- `cursor/marketplace-platform-5fb1`

| ID | Gap | Fix |
|----|-----|-----|
| MKT-001 | No routes, services, schema, or UI on main/current stack | Evaluate marketplace branches; merge or defer |
| MKT-002 | Enterprise vision includes marketplace — sales materials may overstate | Remove from pitch until implemented |
| MKT-003 | No public talent discovery / microsite | Greenfield feature |

---

## 10. Security Fixes Required

| ID | Issue | Severity | Location | Fix |
|----|-------|:--------:|----------|-----|
| SEC-001 | Analytics views — `GRANT SELECT TO authenticated` without tenant filter in view | High | `004_views_analytics.sql:123-127` | Filter or revoke |
| SEC-002 | Observability views — same pattern | High | `019_platform_observability.sql:240-244` | Filter or revoke |
| SEC-003 | Analytics API accessible to all tenant roles | High | `app/api/analytics/dashboard/route.ts` | Manager + permission |
| SEC-004 | Webhook HMAC optional when secret empty | High | WhatsApp + n8n routes | Fail closed |
| SEC-005 | HMAC not timing-safe | Medium | `lib/integrations/encryption.ts` | `timingSafeEqual` |
| SEC-006 | n8n signs parsed JSON not raw bytes | Medium | `verifySignature` usage | Raw body signing |
| SEC-007 | Middleware fails open without Supabase env | Low (dev) | `middleware.ts:59-61` | Fail closed in production |
| SEC-008 | Service role used broadly in cron/webhooks | Medium | `createAdminServices()` | Scope admin client usage |
| SEC-009 | No MFA / SSO | High (enterprise) | Supabase Auth config | Enable SSO + TOTP |
| SEC-010 | No CI security scanning | Medium | Missing `.github/` | Dependabot, npm audit |
| SEC-011 | `shortlists` no DELETE RLS policy | Low | `002_rls_policies.sql:213-221` | Add policy or document |
| SEC-012 | No `SECURITY.md` | Medium | Repo root | Publish policy |
| SEC-013 | PII may appear in observability logs | Medium | `platform_log_entries` | Redact sensitive fields |
| SEC-014 | Hardcoded Supabase project ref in env example | Low | `.env.local.example:2` | Use placeholder |

---

## 11. Performance Fixes Required

| ID | Issue | Location | Fix |
|----|-------|----------|-----|
| PERF-001 | Sequential cron event dispatch (50/run) | `app/api/cron/dispatch-events/route.ts:75-120` | Parallel with concurrency cap |
| PERF-002 | WhatsApp 5–10+ DB calls per message | `whatsapp.service.ts`, webhook route | Batch + reduce re-fetch |
| PERF-003 | `v_dashboard_summary` — 5 correlated subqueries | `004_views_analytics.sql:8-16` | Materialized view |
| PERF-004 | Middleware `tenant_members` lookup every request | `middleware.ts:88-98` | Cache in session/JWT |
| PERF-005 | Double `auth.getUser()` per request | middleware + updateSession | Consolidate |
| PERF-006 | In-memory cache not shared across instances | `lib/repositories/base/cache.ts` | Distributed cache |
| PERF-007 | Missing `freelancers(tenant_id, phone)` index | migrations | Add index |
| PERF-008 | AI match token blowup (50 profiles) | `lib/integrations/ai/openai.ts` | Retrieval + cap |
| PERF-009 | Workflow jobs processed sequentially | `lib/workflows/engine.ts:78-100` | Parallel batch |
| PERF-010 | Multiple `createAdminServices()` in one AI flow | `lib/integrations/ai/matching.ts` | Reuse instance |

---

## 12. Database & RLS Fixes

| ID | Issue | Location | Fix |
|----|-------|----------|-----|
| DB-001 | `emit_domain_event` not granted to `authenticated` | `006_complete_rls_and_integrity.sql:801` | Grant to authenticated or use service role in repo |
| DB-002 | User-initiated emits fail silently | `domain-event.repository.ts:30-32` | Throw or surface error; don't return null |
| DB-003 | No pgvector extension | Knowledge module | Enable extension + embedding column |
| DB-004 | No deliverable versioning tables | Audit §12.2 | Add `deliverables` + `deliverable_versions` |
| DB-005 | Single talent per project constraint | Schema | `project_assignments` many-to-many |
| DB-006 | No down migrations / rollback strategy | `supabase/migrations/` | Document rollback procedure |
| DB-007 | `types/database.ts` hand-maintained | `modules/core/types/database.ts` | Auto-generate from Supabase |
| DB-008 | Activity logs ≠ compliance audit logs | Audit §10.3 | Partitioned `audit_logs` with immutability |
| DB-009 | PostgreSQL version doc drift | docs say 15, config says 17 | Update docs |

---

## 13. Reliability & Event Pipeline Fixes

| ID | Issue | Location | Fix |
|----|-------|----------|-----|
| REL-001 | Vercel crons as job queue (1-min ticks) | `vercel.json` | Durable queue (Inngest/Trigger.dev) |
| REL-002 | Two crons every minute — overlap risk | `dispatch-events` + `process-workflow-jobs` | Job locking + queue |
| REL-003 | n8n idempotency unstable | `n8n/route.ts:11-12` | Stable keys from n8n |
| REL-004 | n8n down → broadcast/WhatsApp silent failure | Audit §10.2 | Retry + alerting |
| REL-005 | In-memory idempotency lost on cold start | `modules/core/api/idempotency.ts:1` | Persistent store |
| REL-006 | Domain event dead letter handling | `domain_events` table | Monitor + replay tooling |
| REL-007 | Observability collector flush failure | `collector.ts:61` | Retry + dead letter log |
| REL-008 | No outbound webhook dispatcher for integrations | Audit §12.1 | Build dispatcher service |

---

## 14. UI & Product Completeness Gaps

From technical audit §9–11:

| ID | Gap | Notes |
|----|-----|-------|
| UI-001 | **Payments read-only** — no approve/pay actions | RLS allows; no `payments.ts` actions |
| UI-002 | **Analytics page placeholder** — no charts wired to Recharts | `app/(dashboard)/analytics/page.tsx` |
| UI-003 | **No agent settings page** | Referenced by actions |
| UI-004 | **No observability ops dashboard** | API exists, no UI |
| UI-005 | **No tenant switcher in header** | Layout components |
| UI-006 | **No notification bell** | Layout components |
| UI-007 | **No loading skeletons / error boundaries / toasts** | Docs reference them; not implemented |
| UI-008 | **No `/companies` admin page** | Companies via seed/actions only |
| UI-009 | **Password reset incomplete** | No set-password page after reset link |
| UI-010 | **Limited shadcn adoption** | Missing table, dialog, toast, tabs in UI kit |
| UI-011 | **No talent-facing mobile/WhatsApp-native UX** | Primary UX is web dashboard |
| UI-012 | **Realtime subscriptions not wired in UI** | Schema ready per audit |

---

## 15. Missing Features (Vision vs Code)

Compared to 17-module lifecycle and enterprise PRD (`docs/24-technical-audit.md` §11):

| Feature | Status |
|---------|--------|
| Talent segments (dynamic/static) | Missing |
| Sample assignment workflow | Missing |
| Task dependencies / Gantt | Missing |
| Deliverable versioning | Missing |
| Multi-step approval chains | Missing |
| Payment provider (Stripe/Wise) | Missing |
| Payment approve/pay UI | Missing |
| WhatsApp template management UI | Missing |
| Talent microsite / magic links | Missing |
| Semantic / vector talent search | Missing |
| Capacity forecasting | Missing |
| Resource planning calendar | Missing |
| Custom fields per workspace | Missing |
| Workflow automation builder (in-app) | Missing — n8n external only |
| Public REST API + outbound webhooks | Mostly missing |
| SSO / MFA | Missing |
| SOC 2 / formal audit logging | Missing |
| Multi-talent projects | Missing |
| Marketplace | Missing on current stack |

---

## 16. Documentation Drift Register

| Document | Says | Reality | Action |
|----------|------|---------|--------|
| `README.md` | Migrations 001–006 | 19 migrations | Update |
| `scripts/push-supabase-schema.sh` | 001–011 | Through 019 | Update |
| `docs/03-database-schema.md` | PostgreSQL 15 | PG 17 in config | Update |
| `docs/06-folder-structure.md` | `.github/workflows/ci.yml` | Absent | Update or add CI |
| `docs/05-api-architecture.md` | Full REST catalog | ~24 routes; actions for CRUD | Update or build API |
| `docs/openapi.yaml` | 16 paths | Missing observability + cron | Extend spec |
| `docs/24-technical-audit.md` | 17 API routes | 24 routes + observability | Refresh audit |
| `docs/05-api-architecture.md` | WhatsApp test endpoint | Not implemented | Remove or build |
| Enterprise PRD branch | 9 files | Not merged with main docs | Merge product docs |

**Missing enterprise docs:** `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG`, incident runbooks, DR plan, data retention policy, ADR directory.

---

## 17. Deprecated Code to Remove or Migrate

| File | Replacement | Action |
|------|-------------|--------|
| `lib/integrations/whatsapp.ts` | `@/lib/whatsapp` | Remove shim |
| `lib/integrations/ai/openai-client.ts` | `@/lib/ai` | Migrate callers |
| `lib/domains/talent/repositories/freelancer.repository.ts` | `TalentRepository` | Remove |
| `lib/core/result.ts` | `@/modules/core/utils/result` | Remove |
| `lib/core/validation.ts` | `@/modules/core/utils/validation` | Remove |
| `lib/core/errors.ts` | `@/modules/core/utils/errors` | Remove |
| `lib/core/supabase-errors.ts` | `@/modules/core/utils/supabase-errors` | Remove |
| `lib/core/context.ts` | `@/modules/core/utils/context` | Remove |
| `lib/whatsapp/intents-legacy.ts` | `lib/whatsapp/intents.ts` | Remove if unused |

---

## 18. Testing & CI Gaps

| ID | Gap | Fix |
|----|-----|-----|
| TST-001 | Zero test files on current branch | Merge `cursor/testing-improvements-5fb1` |
| TST-002 | No `test` script in `package.json` | Add Vitest |
| TST-003 | No CI pipeline | `.github/workflows/ci.yml` |
| TST-004 | CI must run `build`, not just typecheck | Build gate |
| TST-005 | No E2E tests (Playwright) | Critical path coverage |
| TST-006 | No load tests | k6 baseline |
| TST-007 | No RLS isolation tests | Supabase test harness |
| TST-008 | No webhook idempotency tests | Integration tests |
| TST-009 | No agent/MCP tests | Unit tests for reasoning loop |

### Recommended first test targets

1. `lib/whatsapp/intents.ts` — intent classification
2. `modules/core/api/handler.ts` — error mapping, auth modes
3. `lib/integrations/encryption.ts` — HMAC verify
4. `lib/repositories/domain-event.repository.ts` — emit behavior
5. `lib/ai/gateway.ts` — retry/fallback (mocked providers)

---

## 19. Developer Experience Fixes

| ID | Gap | Fix |
|----|-----|-----|
| DX-001 | Build fails but typecheck may pass | Align gates |
| DX-002 | `.env.local.example` incomplete vs `lib/ai/config.ts` | Add all AI provider vars |
| DX-003 | Hardcoded Supabase project ref | Use placeholders |
| DX-004 | No `CONTRIBUTING.md` | Add contribution guide |
| DX-005 | No local troubleshooting doc | Common errors (RLS, cron, n8n) |
| DX-006 | Inconsistent error patterns in actions | Standardize on action adapter |
| DX-007 | Monolithic server actions mix business logic | Extract to services (partially done) |
| DX-008 | No ADR directory for architectural decisions | Add `docs/adr/` |

---

## 20. Prioritized Fix Backlog (Action Items)

Consolidated actionable items from all work streams. IDs reference sections above.

### Sprint 0 — Unblock deploy (must do first)

- [ ] **B-001** Fix `withApiHandler` RouteContext typing
- [ ] **B-003** Production env validation schema
- [ ] **TST-003** Add CI: lint + typecheck + **build**
- [ ] Merge PR #38 (after B-001), #39, #24 in order

### Sprint 1 — Security & reliability hotfixes

- [ ] **SEC-001, SEC-002** Scope analytics/observability view grants
- [ ] **SEC-003, API-006** Protect analytics API
- [ ] **SEC-004, WA-003** Fail closed on missing webhook secrets
- [ ] **DB-001, DB-002** Fix domain event emission
- [ ] **WA-004** Fix duplicate batch early return
- [ ] **API-008, REL-003** Stable n8n idempotency keys
- [ ] **SEC-005** Timing-safe HMAC

### Sprint 2 — Testing & observability completion

- [ ] **TST-001–TST-004** Vitest + CI test gate
- [ ] **OBS-001, OBS-002** Wire workflow + notification instrumentation
- [ ] **OBS-003** Observability dashboard UI
- [ ] **OBS-004, OBS-005** Instrument WhatsApp + MCP/agent
- [ ] **OBS-006** Collector flush retry/alert

### Sprint 3 — Platform capabilities

- [ ] **MCP-001–MCP-003** Implement MCP adapters (talent, projects, CRM first)
- [ ] **AF-002** Agent settings UI
- [ ] **AF-003, WA-007** Unify WhatsApp agent path
- [ ] **API-002, API-003, REL-005** Distributed rate limit + idempotency
- [ ] **PERF-007** Phone index

### Sprint 4 — Enterprise hardening

- [ ] **SEC-009** SSO + MFA
- [ ] **AI-001, AI-002, DB-003** pgvector pipeline
- [ ] **REL-001** Durable job queue
- [ ] **UI-001** Payment approve/pay workflow
- [ ] **DOC-*** Documentation sync sprint
- [ ] **MKT-001** Evaluate marketplace branches

---

## Cross-Reference: Open PRs

| PR | Branch | Blocker for |
|----|--------|-------------|
| #24 | `cursor/agent-framework-5fb1` | Agent product features |
| #38 | `cursor/api-standardization-5fb1` | API consistency (fix B-001 first) |
| #39 | `cursor/platform-observability-5fb1` | Ops visibility |
| #40 | `cursor/enterprise-readiness-report-5fb1` | Documentation only |

---

## Related Documents

| Document | Path |
|----------|------|
| Enterprise Readiness Review | `docs/Platform/ENTERPRISE_READINESS_REVIEW.md` |
| Technical Audit | `docs/24-technical-audit.md` |
| Agent Framework Architecture | `docs/Platform/AGENT_FRAMEWORK_ARCHITECTURE.md` |
| API Standardization | `docs/Platform/API_STANDARDIZATION.md` |
| Observability Architecture | `docs/Platform/OBSERVABILITY_ARCHITECTURE.md` |
| MCP Architecture | `docs/28-mcp-architecture.md` |
| WhatsApp Interface | `docs/32-whatsapp-interface.md` |

---

*End of Engineering Gaps & Remediation Backlog — July 30, 2026*
