# Talent OS — Scope Review

**Document version:** 1.0.0  
**Date:** July 31, 2026  
**Author:** Principal Software Architect  
**Status:** **Approved** — July 31, 2026  
**Scope:** Reconcile all planning documents against **Talent OS as a single product**

---

## Executive Summary

Talent OS is an **AI-native Workforce Operating System** for remote-first, project-based service companies (agencies, studios, consultancies). The repository should implement **one product**, not a multi-product SaaS holding company.

A review of **15 planning and architecture documents** (see §1) reveals a structural mismatch:

| Finding | Detail |
|---------|--------|
| **Vision drift** | Recent `docs/Architecture/` work describes **83 PRs across seven “platform waves”** built for three products (`talent_os`, `media_intel`, `ad_studio`). |
| **Solid core** | Enterprise readiness, gap analysis, and technical audit docs correctly focus on **Talent OS workforce lifecycle** — talent, projects, assignments, WhatsApp, AI matching, knowledge. |
| **Over-build risk** | The 83-PR program effectively designs in-house equivalents of **Stripe Billing, LaunchDarkly, Elasticsearch, SOC2 audit SaaS, and BPM** before Talent OS has production customers. |
| **Under-build risk** | Deferring **MCP adapters, guardrails, pgvector RAG, and payment UI** hurts the actual product; deferring **multi-product registries** does not. |

### Recommended posture

**Keep** building Talent OS as a modular monolith with clean module boundaries. **Remove** multi-product scaffolding, hypothetical product registrations, and six parallel “platform” waves. **Postpone** enterprise SaaS billing, feature-flag experiments, and declarative workflow cutover until Talent OS has paying customers or an explicit enterprise deal. **Essential now:** P0 production hardening (mostly done on branch), AI gateway security, embeddings for matching/knowledge, MCP/agent execution for AI PM, and core workforce features (payments UI, deliverable versioning).

### Revised program size

| Program | PRs / effort | Recommendation |
|---------|--------------|----------------|
| Original AI + Platform roadmap | 83 PRs · ~15 weeks | **Retire as execution plan** |
| Revised Talent OS program (§7) | **~28 PRs · ~8 weeks** | **Adopt after approval** |

---

## 1. Documents reviewed

| # | Document requested | File(s) in repo | Notes |
|---|-------------------|-----------------|-------|
| 1 | Platform Blueprint | **Not found** as standalone doc | Closest: `docs/Architecture/PLATFORM_CORE.md`, `AI_PLATFORM.md`, six platform architecture docs, `ENGINEERING_EXECUTION_PLAN.md` — treated as **Platform Blueprint bundle** |
| 2 | Enterprise Readiness Report | `docs/Platform/ENTERPRISE_READINESS_REVIEW.md`, `PRODUCTION_READINESS_REPORT.md` | Pre- and post-P0 assessments |
| 3 | Gap Analysis | `GAP_ANALYSIS_STUDY_PACK.md`, `ENGINEERING_GAPS_AND_REMEDIATION.md`, `GAP_RESOLUTION_TRACKER.md` | Workforce-focused; no multi-product |
| 4 | AI Platform Architecture | `docs/Architecture/AI_PLATFORM.md` | **Heavy multi-product framing** |
| 5 | AI Gap Analysis | `docs/Architecture/AI_GAP_ANALYSIS.md` | Maps to 83-PR roadmap |
| 6 | AI Implementation Roadmap | `docs/Architecture/AI_IMPLEMENTATION_ROADMAP.md` | 83 PRs |
| 7 | Enterprise Hardening | `docs/Platform/ENTERPRISE_HARDENING.md` | Bug fixes + migration 020 |
| 8 | Risk Register | Embedded in `ENTERPRISE_READINESS_REVIEW.md` (R-001–R-017), `CRITICAL_ANALYSIS_POST_HARDENING.md` | No standalone file |
| 9 | Security Report | `SECURITY.md` + security sections in readiness docs | Policy + controls |
| 10 | Performance Report | PERF-* gaps in `ENGINEERING_GAPS_AND_REMEDIATION.md`, §1.2 of readiness review | No standalone file |
| 11 | Technical Debt Report | `docs/24-technical-audit.md` §10–12 | Comprehensive debt catalog |

**Also referenced for cross-check:** `docs/11-enterprise-system-architecture.md`, `CRITICAL_ANALYSIS_POST_HARDENING.md`, `DISTRIBUTED_STATE_ARCHITECTURE.md`, `SPRINT_01–05.md`.

---

## 2. Document-by-document classification

Legend:

| Code | Meaning |
|------|---------|
| **E** | Essential for Talent OS |
| **L** | Useful later for Talent OS |
| **O** | Out of scope (other products / not this repo) |
| **R** | Remove completely from plans and docs |

### 2.1 Platform Blueprint bundle

*Files: `PLATFORM_CORE.md`, `AI_PLATFORM.md`, `BILLING_PLATFORM.md`, `FEATURE_FLAGS_PLATFORM.md`, `SEARCH_PLATFORM.md`, `AUDIT_PLATFORM.md`, `WORKFLOW_PLATFORM.md`, `AI_IMPLEMENTATION_ROADMAP.md`, `ENGINEERING_EXECUTION_PLAN.md`, `SPRINT_01–05.md`*

| Recommendation | Class | Rationale |
|----------------|-------|-----------|
| Shared AI gateway with guardrails, ledger, budgets | **E** | Core to AI-native matching, PM, WhatsApp |
| `@/modules/platform` SDK with org context | **L** | Useful boundary; simplify to single product |
| Product registry with `talent_os`, `media_intel`, `ad_studio` | **R** | Multi-product; only Talent OS exists |
| Embedding namespaces for Media Intel / Ad Studio | **O** | Other products |
| Billing Platform (8 PRs, Stripe, invoices, meters) | **L** | Useful when selling SaaS; not blocking workforce OS |
| Feature Flags Platform (5-layer eval, experiments) | **L** | Tenant `settings.features` sufficient for now |
| Search Platform (8 PRs, hybrid, saved alerts) | **L** | Unify later; keyword + pgvector RAG is **E** now |
| Audit Platform (8 PRs, immutable SOC2 trail) | **L** | Activity logs + AI ledger **E**; full platform later |
| Workflow Platform (Lead→Invoice declarative pipeline) | **L** | Existing engine **E**; declarative CRM pipeline not |
| 83-PR / 15-week execution program | **R** | Over-scoped for one engineer / one product |
| Sprint playbooks assigning 16 PRs per sprint | **R** | Replace with revised order (§7) |

### 2.2 Enterprise Readiness Review (`ENTERPRISE_READINESS_REVIEW.md`)

| Recommendation | Class | Rationale |
|----------------|-------|-----------|
| CI/CD (lint, typecheck, test, build) | **E** | Resolved on P0 branch |
| Distributed rate limits / idempotency (Redis) | **E** | Resolved on P0 branch |
| Fix analytics cross-tenant view grants | **E** | Migration 020 |
| Webhook HMAC fail-closed | **E** | Resolved |
| Vitest + RLS integration tests | **E** | Resolved on P0 branch |
| MCP tool adapters (talent, projects, CRM) | **E** | Agents blocked without these |
| Agent settings UI | **E** | Product feature for AI PM |
| WhatsApp → agent framework unification | **E** | Core channel |
| MFA/SSO | **L** | Enterprise procurement; not pilot blocker |
| Durable job queue (Inngest) | **L** | Replace cron-at-scale; not day-one |
| pgvector embedding pipeline | **E** | AI matching + knowledge |
| Observability dashboard UI | **L** | Tables exist; UI can wait |
| Public API v1 | **L** | Integrations; not core product |
| Marketplace module | **O** | Different product surface |
| Pen test / SOC2 compliance pack | **L** | When selling enterprise |
| Consolidate dual AI paths | **E** | Reduces bugs and cost |
| Merge feature branches to main | **E** | Deployment prerequisite |

### 2.3 Production Readiness Report (`PRODUCTION_READINESS_REPORT.md`)

| Recommendation | Class | Rationale |
|----------------|-------|-----------|
| Apply migrations 020–021, Upstash Redis, secrets | **E** | Production cutover |
| Go for production (7.8/10) | **E** | Aligns with pilot agencies |
| Conditional enterprise until MFA + MCP | **E** | Accurate framing |
| Phase B: MFA, MCP, load tests | **L/E** | MFA **L**; MCP **E** |
| Phase C: job queue, observability UI, pgvector | **L/E** | pgvector **E**; rest **L** |

### 2.4 Gap Analysis bundle

| Recommendation | Class | Rationale |
|----------------|-------|-----------|
| Sprint 0: fix build, CI, merge #38/#39/#24 | **E** | Unblock shipping |
| Sprint 1: security fixes (SEC-*, WA-*, DB-*) | **E** | Mostly done in hardening/P0 |
| Sprint 2: Vitest, observability wiring | **E** | Mostly done |
| Sprint 3: MCP adapters, agent UI | **E** | Still open |
| Sprint 4: SSO, pgvector, job queue | **L/E** | SSO **L**; pgvector **E** |
| Payment approve/pay UI (UI-001) | **E** | Finance workflow incomplete |
| Deliverable versioning | **E** | Delivery lifecycle gap |
| Talent segments, Gantt, capacity forecasting | **L** | Valuable; not v1 |
| Custom fields, workflow builder UI | **L** | Post-PMF |
| Marketplace branches evaluation | **R** | Out of product scope |
| Stripe/Wise integration | **L** | When billing becomes revenue |

### 2.5 AI Platform Architecture (`AI_PLATFORM.md`)

| Recommendation | Class | Rationale |
|----------------|-------|-----------|
| AI Gateway pipeline (auth, budget, guardrails, ledger) | **E** | Production AI safety |
| Prompt Platform (DB-backed versions) | **E** | Repeatable AI behavior |
| Embedding Platform (pgvector) | **E** | Matching + knowledge |
| Cost Platform (budgets, aggregates) | **E** | Prevent runaway spend |
| Memory Platform (scoped agent memory) | **E** | AI PM + WhatsApp agent |
| AI Observability (trace, quality) | **L** | Basic ledger **E**; eval CI **L** |
| Multi-product C4 (Media Intel, Ad Studio apps) | **O** | Other products |
| `createAiPlatformClient(productId)` multi-product SDK | **L** | Simplify to Talent OS client |
| Azure OpenAI + cross-region failover | **L** | Azure **L**; single provider **E** |
| ML model routing, fine-tuning pipeline | **R** | Premature |
| 18-stage middleware (full enterprise) | **L** | Implement core 8 stages first |
| Phase 3–4 multi-product registration | **O** | Not this repo |

### 2.6 AI Gap Analysis (`AI_GAP_ANALYSIS.md`)

| Recommendation | Class | Rationale |
|----------------|-------|-----------|
| P0: guardrails, PII, direct execution, unified ledger | **E** | Security and cost integrity |
| P0: embeddings + MCP adapters | **E** | Intelligence + agents |
| P1: prompt DB, budgets, routing, tests | **E** | Governed AI |
| P2: eval CI, OTel, quality reports | **L** | After core ships |
| Multi-product maturity (M-016, M-017, M-025) | **R** | Wrong product scope |
| Billing Wave 0b closure | **L** | Defer Stripe platform |
| Feature Flags Wave 0c closure | **L** | Tenant settings enough |
| Search/Audit/Workflow wave closure | **L** | Incremental, not 8-PR waves |
| External vector DB evaluation | **L** | pgvector first is correct |

### 2.7 AI Implementation Roadmap (`AI_IMPLEMENTATION_ROADMAP.md`)

| Recommendation | Class | Rationale |
|----------------|-------|-----------|
| PR-01–05 (AI foundation) | **E** | Tests, schema, ledger |
| PR-06–10 (gateway security) | **E** | Guardrails, PII, circuit breakers |
| PR-11–15 (AI client, Azure optional) | **E/L** | Client **E**; Azure **L** |
| PR-16–21 (prompts, budgets) | **E** | Governed prompts and cost |
| PR-22–25 (embeddings) | **E** | Core intelligence |
| PR-26–28 (MCP, agents) | **E** | Agent execution |
| PR-29–32 (memory, client migration) | **E** | Agent memory + clean API |
| PR-33–42 (quality, OTel, deprecation) | **L** | Polish; trim to 2–3 PRs |
| PR-00 multi-product Platform Core | **L/R** | Keep module; **remove** 3-product registry |
| PR-B01–B08 Billing Platform | **L** | Defer full wave |
| PR-FF01–FF08 Feature Flags Platform | **L** | Defer full wave |
| PR-S01–S08 Search Platform | **L** | Keep PR-S02/S07 concepts only |
| PR-A01–A08 Audit Platform | **L** | Keep PR-A01–A05 concepts only |
| PR-W01–W08 Workflow Platform | **L/R** | Keep engine; **remove** Lead/Proposal CRM |

### 2.8 Enterprise Hardening (`ENTERPRISE_HARDENING.md`)

| Recommendation | Class | Rationale |
|----------------|-------|-----------|
| Migration 020 secure RPCs, RLS, analytics auth | **E** | Shipped |
| Webhook fail-closed, timing-safe HMAC | **E** | Shipped |
| CI + Vitest baseline | **E** | Shipped |
| Workflow/notification instrumentation | **E** | Shipped |
| Explicitly deferred: MCP, agent UI, marketplace, SSO | **E** | Correct deferrals — still open |
| Distributed Redis (follow-up P0) | **E** | Shipped on P0 branch |

### 2.9 Risk Register (embedded R-001–R-017)

| Risk / mitigation | Class | Rationale |
|-------------------|-------|-----------|
| R-004–R-007 build/CI/env gaps | **E** | Addressed on P0 branch |
| R-008 in-memory rate limits | **E** | Redis on P0 branch |
| R-009 MCP stubs | **E** | Still open — product blocker |
| R-011 no MFA/SSO | **L** | Enterprise sales gate |
| R-017 incomplete compliance artifacts | **L** | Before SOC2 sales |
| Marketplace in production scope | **R** | Remove from risk register |

### 2.10 Security Report (`SECURITY.md` + readiness security sections)

| Recommendation | Class | Rationale |
|----------------|-------|-----------|
| RLS on all tenant tables | **E** | Core isolation |
| Service-role-only sensitive tables | **E** | Idempotency, etc. |
| Webhook HMAC verification | **E** | WhatsApp security |
| Security CI (CodeQL, Gitleaks, Trivy) | **E** | On P0 branch |
| MFA/SSO | **L** | Enterprise |
| PII redaction in logs | **L** | Before scale |
| Penetration test | **L** | Pre-enterprise procurement |

### 2.11 Performance Report (PERF-* gaps)

| Recommendation | Class | Rationale |
|----------------|-------|-----------|
| PERF-001 parallel cron / job queue | **L** | Cron OK for pilot |
| PERF-002 WhatsApp batching | **E** | High-volume channel |
| PERF-003 dashboard materialized view | **L** | Optimize when slow |
| PERF-004 AI match prompt size / embeddings | **E** | Requires pgvector |
| PERF-007 phone index | **E** | Shipped in hardening |
| PERF-009 session tenant cache | **L** | Nice optimization |
| Load testing baseline | **L** | Before SLA commitments |

### 2.12 Technical Debt Report (`docs/24-technical-audit.md`)

| Recommendation | Class | Rationale |
|----------------|-------|-----------|
| P0 CI + Supabase types | **E** | Partially done |
| P0 payment approve/pay UI | **E** | User-visible gap |
| P1 pgvector + embedding pipeline | **E** | AI-native claim |
| P1 WhatsApp NLU + consent | **E** | Channel maturity |
| P2 domain service layer + tests | **E** | Repos/services exist on branch |
| P2 public API v1 | **L** | Integrations |
| P3 Inngest replace n8n critical path | **L** | n8n works for side effects |
| P3 SSO/MFA | **L** | Enterprise |
| Missing: segments, Gantt, marketplace | **L/O** | Segments **L**; marketplace **R** |
| Dual AI path consolidation | **E** | Active debt |
| `audit_logs` partitioned table proposal | **L** | Full audit platform deferred |

### 2.13 Enterprise System Architecture (`docs/11-enterprise-system-architecture.md`)

| Recommendation | Class | Rationale |
|----------------|-------|-----------|
| Layered monolith, bounded contexts | **E** | Good fit |
| Transactional outbox + n8n side effects | **E** | Current pattern |
| 17 domain events | **E** | Keep catalog disciplined |
| Subscription tiers in tenant settings | **E** | Simple billing for now |
| Stripe Phase 2 | **L** | When monetizing SaaS |
| Phase 4 dedicated DB / multi-region | **L** | Scale path |
| Intelligence bounded context | **E** | AI is core |

---

## 3. Features to keep

These directly serve Talent OS workforce lifecycle and should remain **active priorities**.

### 3.1 Core workforce (non-AI)

| Feature | Source docs | Status |
|---------|-------------|--------|
| Multi-tenant orgs, RBAC, RLS | HLD, audit | Strong |
| Talent roster, skills, availability | PRD, audit | Built |
| Opportunities → projects → milestones | PRD, workflow doc | Built |
| Assignments, shortlists, matching (rules + AI) | PRD, sprints | Partial |
| CRM (companies, leads as opportunities) | PRD | Built — **no separate Lead entity needed** |
| Finance (invoices, payments, milestones) | PRD, audit | Partial — **payment UI essential** |
| Deliverable submission + QA | PRD | Built — **versioning needed** |
| WhatsApp inbound/outbound | Integration docs | Partial — **agent path essential** |
| Knowledge base + search | Knowledge module | Partial — **embeddings essential** |
| Notifications, activity logs | HLD | Built |
| n8n for email/WhatsApp side effects | HLD | Keep |

### 3.2 Platform engineering (Talent OS only)

| Feature | Notes |
|---------|-------|
| CI/CD, Vitest, Playwright, security scanning | P0 branch — merge to main |
| Redis distributed rate limits + idempotency | P0 branch |
| API platform (`withApiHandler`) | Standardize remaining routes |
| Repository + service layers | On branch — merge |
| Domain event outbox + workflow engine | Keep; extend, don’t replace |
| Observability tables + instrumentation | Keep backend; UI later |
| `SECURITY.md`, production checklist | Keep updated |

### 3.3 AI-native (Talent OS scope)

| Feature | Trimmed from roadmap |
|---------|---------------------|
| AI gateway with guardrails, PII, circuit breakers | PR-06–10 |
| Unified AI ledger (`ai_requests`) | PR-05 |
| DB-backed prompts with versioning | PR-16–18 |
| Budget alerts + optional hard limit | PR-19–21 |
| pgvector embeddings (talent + knowledge) | PR-22–25 |
| MCP adapters: talent, projects, CRM, knowledge | PR-26–28 (split scope) |
| Agent memory + AI PM agent | PR-29–30 |
| Single AI client; deprecate `getAiGateway` | PR-32, PR-42 |
| Tenant-level AI feature toggles | `tenant.settings.features` — **no platform wave** |

### 3.4 Simplified platform module

Keep **`modules/platform`** only as **Talent OS internal shared kernel**:

- Organization context (tenant → org mapping)
- Typed platform events wrapping outbox
- Config from env + tenant settings
- **Single product constant** — no registry of future products

---

## 4. Features to postpone

Defer until Talent OS has **production customers**, **clear monetization**, or an **signed enterprise deal**.

| Feature | Original plan | Postpone until |
|---------|---------------|----------------|
| Stripe Billing Platform (PR-B01–B08) | 8 PRs | SaaS billing is a business decision |
| Feature Flags Platform experiments (PR-FF04–FF08) | 5 PRs | >50 orgs or weekly flag changes |
| Feature Flags 5-layer eval (PR-FF01–FF03) | 3 PRs | Replace with env + tenant settings |
| Search Platform saved alerts (PR-S06) | 1 PR | Unified search exists |
| Hybrid search orchestrator (PR-S03–S04) | 2 PRs | After embeddings prove value |
| Audit Platform export/SIEM (PR-A06–A08) | 3 PRs | Enterprise audit request |
| Workflow declarative cutover (PR-W05–W08) | 4 PRs | Process change, high risk |
| Lead + Proposal CRM entities (PR-W02) | 1 PR | Opportunities suffice today |
| MFA/SSO | Multiple docs | Enterprise procurement |
| Public API v1 + outbound webhooks | Audit, HLD | Integration partner signed |
| Durable job queue (Inngest) | Multiple docs | Cron backlog > 5 min |
| Observability admin UI | OBS-003 | Ops pain observed |
| OTel export, eval CI, quality reports | PR-33–41 | Post-GA polish |
| Azure OpenAI provider | PR-12 | Customer requires Azure |
| Marketplace | Readiness review | Different product |
| Capacity forecasting, Gantt, segments | Technical audit | PMF features |

---

## 5. Features to remove

Remove from **roadmaps, architecture docs, code scaffolding, and sprint plans**. Do not delete working Talent OS features — remove **hypothetical product and platform scope**.

| Item | Action |
|------|--------|
| `media_intel` and `ad_studio` product definitions | Remove from types, registry, docs, seeds |
| Multi-product C4 diagrams in `AI_PLATFORM.md` | Rewrite for Talent OS only |
| ProductId union `'talent_os' \| 'media_intel' \| 'ad_studio'` | Replace with `'talent_os'` or remove ProductId |
| Embedding namespaces `media.content`, `creative.assets` | Remove (PR-31, PR-38) |
| AI feature namespaces for non-existent products | Remove |
| **83-PR program** and **SPRINT_01–05** as execution authority | Archive; replace with §7 |
| **Billing Platform** as parallel 8-PR wave | Archive doc or mark "future SaaS" |
| **Feature Flags Platform** as parallel 8-PR wave | Archive; document tenant settings pattern |
| **Search Platform** as parallel 8-PR wave | Merge into knowledge/talent modules |
| **Audit Platform** as parallel 8-PR wave | Merge minimal capture into services |
| **Workflow Platform** Lead→Invoice pipeline | Remove; keep execution engine doc |
| Marketplace branches and docs | Close or archive PRs |
| LaunchDarkly / external flag SaaS comparisons | Remove from near-term plans |
| ML routing, fine-tuning, cross-region failover | Remove from Phase 1–2 |
| "Six platforms GA" success metrics | Remove from execution plan |
| Separate Next.js apps for Media Intel / Ad Studio | Out of repo — never implement |

---

## 6. Architecture simplifications

### 6.1 From multi-product platform → Talent OS modules

```
BEFORE (over-engineered)                    AFTER (Talent OS)
─────────────────────────                   ───────────────────
modules/platform/                           modules/platform/  (thin kernel)
  products/ (3 products)          →           context/ + events/ only
  features/ (5-layer flags)       →           lib/features/ or tenant.settings
  config/ (4-layer merge)         →           lib/env + tenant.settings
modules/billing/ (12 tables)        →           tenant.settings.subscription (now)
modules/search/ (orchestrator)      →           lib/search/ (talent + knowledge)
modules/workflow/process/ (CRM)     →           lib/workflows/ (existing engine)
@/lib/ai-platform (multi-product)   →           @/lib/ai/ (Talent OS AI module)
```

### 6.2 AI architecture (trimmed)

**Keep eight concepts, implement as one module (`lib/ai/`):**

1. Gateway (execute, guard, log)
2. Providers (OpenAI first; Anthropic optional)
3. Prompts (DB versions)
4. Embeddings (pgvector, two indices: talent + knowledge)
5. Memory (agent sessions — extend existing tables)
6. Cost (budgets + ledger)
7. Observability (request logs — extend `ai_requests`)
8. Security (PII, feature toggles from tenant settings)

**Remove:** product registration API, cross-product embedding namespaces, 18-stage pipeline spec as mandatory, Phase 3–4 scale items.

### 6.3 Workflow simplification

| Keep | Remove |
|------|--------|
| `lib/workflows/engine.ts` + registry | Declarative YAML process definitions |
| Domain events triggering workflows | `leads` and `proposals` tables |
| Milestone/opportunity status transitions | 8-stage Kanban process board API |
| n8n for notifications/email | In-app workflow builder UI |

### 6.4 Billing simplification

| Keep | Remove |
|------|--------|
| `tenant.settings.subscription` tier limits | `billing_subscriptions`, Stripe webhooks |
| AI monthly caps by tier (existing) | Usage meters, invoices, dunning |
| Admin manual tier assignment | Seat overage billing |

**Trigger to revisit:** first paying SaaS customer or self-serve signup.

### 6.5 Feature flags simplification

| Layer | Implementation |
|-------|----------------|
| Kill switch | `AI_FEATURE_*` env vars (exists) |
| Org toggle | `tenant.settings.features.*` (exists) |
| Remove | DB flag tables, rollouts, experiments, bucketing |

**Trigger to revisit:** weekly production flag changes or A/B tests.

### 6.6 Search simplification

| Keep | Remove |
|------|--------|
| `search_freelancers`, `search_knowledge_entries` RPCs | Unified `SearchPlatformService` |
| Add tsvector on talent (if missing) | Saved search alerts |
| pgvector on knowledge (exists) | Hybrid RRF orchestrator (phase 2) |

### 6.7 Audit simplification

| Keep | Remove |
|------|--------|
| `activity_logs` for user actions | Immutable `audit_records` platform |
| `ai_requests` for AI audit | Before/after snapshots on all mutations |
| Correlation IDs in API context | SIEM export, 7-year retention tiers |

**Trigger to revisit:** enterprise customer requires SOC2 evidence.

---

## 7. Updated priorities

### P0 — Ship pilot (weeks 1–2)

| # | Item | Source |
|---|------|--------|
| 1 | Merge P0 branch → main (migrations 014–021, CI, Redis, tests) | Readiness, P0 |
| 2 | Apply migration 022 **only if** simplified (single product) or defer schema until doc approval | PR-00 |
| 3 | Merge API standardization (#38) if build green | Gap analysis |
| 4 | Payment approve/pay actions + UI | Technical audit P0 |
| 5 | Fix remaining OPEN gaps: MCP-001, AF-001, AF-002 | Gap tracker |

### P1 — AI-native core (weeks 3–6)

| # | Item | Maps from |
|---|------|-----------|
| 6 | AI gateway guardrails + PII + circuit breakers | PR-06–10 |
| 7 | Unified AI ledger (no dual write) | PR-05 |
| 8 | Prompt DB + seed templates | PR-16–18 |
| 9 | Budget soft alerts (+ optional hard 402) | PR-19–21 |
| 10 | pgvector indexing for knowledge + talent matching | PR-22–25 |
| 11 | MCP adapters: talent, projects, CRM, knowledge | PR-26–28 |
| 12 | Agent memory + WhatsApp agent unification | PR-29–30, AF-003 |
| 13 | Consolidate dual AI paths | AF-006, TD |

### P2 — Workforce depth (weeks 7–10)

| # | Item | Source |
|---|------|--------|
| 14 | Deliverable versioning schema + UI | Technical audit |
| 15 | Talent keyword search upgrade (tsvector) | Search gap |
| 16 | WhatsApp NLU + consent (STOP) | Technical audit |
| 17 | AI PM agent tools end-to-end | Sprint 6 doc |
| 18 | Deprecate `getAiGateway` | PR-42 |
| 19 | Documentation sync (API catalog vs reality) | DOC gaps |

### P3 — Enterprise (when sold)

| # | Item |
|---|------|
| 20 | MFA/SSO |
| 21 | Stripe billing (minimal, not full platform) |
| 22 | Immutable audit trail |
| 23 | Load testing + pen test |
| 24 | Durable job queue |
| 25 | Public API v1 |

---

## 8. Revised implementation order

**~28 PRs · ~8 weeks · 1 senior engineer + AI tools**

Replaces 83-PR / 15-week program. Branch naming: `cursor/talent-pr-XX-<slug>-5fb1`.

### Phase A — Production foundation (5 PRs)

| PR | Title | Essential |
|----|-------|-----------|
| T-01 | Merge P0 to main + migration apply runbook | Yes |
| T-02 | Simplify Platform Core (single product, remove media/ad stubs) | Yes |
| T-03 | Payment approve/pay workflow UI | Yes |
| T-04 | API route standardization completion | Yes |
| T-05 | Documentation truth pass (API catalog, README, migrations index) | Yes |

### Phase B — AI security & integrity (6 PRs)

| PR | Title | From |
|----|-------|------|
| T-06 | MockProvider + AI test harness | PR-01 |
| T-07 | Extend `ai_requests` schema | PR-02 |
| T-08 | Direct execution default + agent tagging | PR-03–04 |
| T-09 | Unified AI ledger | PR-05 |
| T-10 | Gateway pipeline + circuit breakers | PR-06–07 |
| T-11 | Guardrails + PII middleware | PR-08–09 |

### Phase C — AI product (8 PRs)

| PR | Title | From |
|----|-------|------|
| T-12 | Talent OS AI client (`createAiClient()`) | PR-11 |
| T-13 | Prompt platform migration + seeds | PR-16–18 |
| T-14 | Budget aggregates + enforcement | PR-19–21 |
| T-15 | Embedding service + knowledge indexing | PR-22–24 |
| T-16 | Talent semantic match integration | PR-25 |
| T-17 | MCP core adapters | PR-26–27 (split) |
| T-18 | Agent framework + memory | PR-28–30 |
| T-19 | Deprecate `getAiGateway` | PR-32, PR-42 |

### Phase D — Workforce & channel (5 PRs)

| PR | Title | Source |
|----|-------|--------|
| T-20 | Deliverable versioning | Technical audit |
| T-21 | WhatsApp agent + NLU path | WA gaps |
| T-22 | Agent settings UI | AF-002 |
| T-23 | Talent keyword search (tsvector) | Search gap |
| T-24 | AI PM agent tool wiring | Sprint 6 |

### Phase E — Optional hardening (4 PRs, as capacity)

| PR | Title | From |
|----|-------|------|
| T-25 | Minimal audit capture hook (activity + AI, no platform wave) | PR-A02 subset |
| T-26 | AI quality metrics (basic, not eval CI) | PR-35 subset |
| T-27 | Provider health + routing policies | PR-13–15 |
| T-28 | Observability dashboard (read-only) | OBS-003 |

### Explicitly excluded from revised order

- PR-B01–B08 (Billing Platform wave)
- PR-FF01–FF08 (Feature Flags Platform wave)
- PR-S01–S08 as wave (only T-23 keyword subset kept)
- PR-A01–A08 as wave (only T-25 minimal hook)
- PR-W01–W08 (Workflow Platform wave)
- PR-31, PR-38 (multi-product namespaces)
- PR-33–34, PR-36–41 (premature polish)
- SPRINT_01–05 execution playbooks

---

## 9. Risks of over-engineering

| Risk | If we keep 83-PR plan | Mitigation in revised scope |
|------|------------------------|----------------------------|
| **Never ship** | 16 PRs in Sprint 1 alone | 5 PRs in Phase A; pilot in 2 weeks |
| **Wrong abstraction locked in** | 3-product registry in DB + SDK | Single-product kernel; extract later if needed |
| **Billing before PMF** | Stripe + 12 tables | Tier in `tenant.settings` until revenue |
| **Compliance theater** | Immutable audit on every row | Activity logs + AI ledger until SOC2 sale |
| **CRM scope creep** | Lead + Proposal + 8-stage pipeline | Opportunities → projects flow stays |
| **Flag platform before users** | Experiments + bucketing | Env + tenant JSON |
| **Search platform duplication** | Orchestrator over working RPCs | Extend existing search |
| **Workflow cutover regression** | PR-W08 replaces all status jumps | Keep registry; incremental transitions |
| **Engineer context switch** | 6 parallel platform tracks | One track: workforce + AI |
| **Doc/code divergence grows** | 65 markdown files, 40 platform PRs | Truth pass in T-05; archive platform waves |
| **AI cost without budgets** | Delay budgets for billing platform | T-14 in Phase C |
| **Agents stay broken** | MCP deferred for platform schemas | T-17 in Phase C, early |

### Principle to adopt

> **Design modules with reuse-friendly boundaries; implement only what Talent OS users touch this quarter.**

Good boundaries (keep): `lib/ai/`, `lib/workflows/`, `lib/repositories/`, `modules/core/`.  
Premature boundaries (remove): product registry, billing platform module, search orchestrator, process definition engine.

---

## 10. Document disposition after approval

| Document | Recommended action |
|----------|-------------------|
| `AI_IMPLEMENTATION_ROADMAP.md` | Archive → `docs/Archive/`; add deprecation banner |
| `ENGINEERING_EXECUTION_PLAN.md` | Archive |
| `SPRINT_01–05.md` | Archive |
| `BILLING_PLATFORM.md` | Move to `docs/Future/` or archive |
| `FEATURE_FLAGS_PLATFORM.md` | Archive |
| `SEARCH_PLATFORM.md` | Archive; extract §7 talent tsvector into backlog |
| `AUDIT_PLATFORM.md` | Archive |
| `WORKFLOW_PLATFORM.md` | Archive; keep `docs/31-workflow-engine.md` |
| `AI_PLATFORM.md` | **Rewrite** → Talent OS AI Module (single product) |
| `AI_GAP_ANALYSIS.md` | **Rewrite** → remove multi-product gaps |
| `PLATFORM_CORE.md` | **Rewrite** → single-product kernel |
| `ENTERPRISE_READINESS_REVIEW.md` | Keep; update scores post-P0 merge |
| `ENGINEERING_GAPS_AND_REMEDIATION.md` | Keep; trim marketplace, align sprints to §7 |
| `24-technical-audit.md` | Keep; refresh after Phase A |
| `SECURITY.md`, `PRODUCTION_CHECKLIST.md` | Keep; update |

---

**Status: Approved — July 31, 2026**

| # | Decision | Approved |
|---|----------|----------|
| 1 | Single-product scope (no Media Intel / Ad Studio in repo) | Yes |
| 2 | Retire 83-PR program | Yes |
| 3 | Postpone six platform waves | Yes |
| 4 | Simplify PR-00 (remove multi-product registry from migration 022) | Yes |
| 5 | P0 merge to main as T-01 | Yes — merged PR #42 |

**Implementation authority:** [TALENT_OS_IMPLEMENTATION_ROADMAP.md](./TALENT_OS_IMPLEMENTATION_ROADMAP.md)

---

**Status: Approved — implementation in progress on `cursor/talent-pr-01-scope-approved-5fb1`.**

*End of Talent OS Scope Review v1.0.0*
