# Talent OS — Implementation Roadmap

**Document version:** 1.0.0  
**Date:** July 31, 2026  
**Status:** **Active** — approved single-product scope  
**Supersedes:** [Archived 83-PR program](../Archive/AI_IMPLEMENTATION_ROADMAP.md)  
**Source:** [TALENT_OS_SCOPE_REVIEW.md](./TALENT_OS_SCOPE_REVIEW.md) §7–§8

---

## Overview

| Metric | Value |
|--------|-------|
| Total PRs | **~28** (T-01–T-28) |
| Duration | **~8 weeks** (1 senior engineer + AI tools) |
| Product scope | **Talent OS only** |
| Branch prefix | `cursor/talent-pr-TXX-<slug>-5fb1` |

### Completed

| PR | Title | Status |
|----|-------|--------|
| **T-01** | Merge P0 to main (migrations 014–021, CI, Redis, tests) | **Done** — merged PR #42 |
| **T-02** | Simplify Platform Core (single-product migration 022) | **Done** — PR #56 |
| **T-03** | Payment approve/pay workflow UI | **Done** — PR #56 |
| **T-04** | API route standardization completion | **Done** — PR #56 |
| **T-05** | Documentation truth pass | **Done** — PR #56 |
| **T-06** | MockProvider + AI test harness | **Done** — PR #65 |
| **T-07** | Extend `ai_requests` schema | **Done** — PR #65 |
| **T-08** | Direct execution default + agent tagging | **Done** — PR #65 |
| **T-09** | Unified AI ledger | **Done** — PR #65 |
| **T-10** | Gateway pipeline + circuit breakers | **Done** — PR #65 |
| **T-11** | Guardrails + PII middleware | **Done** — PR #65 |

### In progress

| PR | Title | Status |
|----|-------|--------|
| — | Phase C — AI product (T-12+) | Next |

---

## Phase A — Production foundation (T-01–T-05)

| PR | Title | Priority |
|----|-------|----------|
| T-01 | Merge P0 to main | **Done** |
| T-02 | Simplify Platform Core — `@/modules/platform`, migration 022 | P0 |
| T-03 | Payment approve/pay workflow UI | P0 |
| T-04 | API route standardization completion | P0 |
| T-05 | Documentation truth pass (API catalog, migrations index) | P1 |

**Exit criteria:** `main` has CI green, migrations 001–022, platform kernel merged.

---

## Phase B — AI security & integrity (T-06–T-11)

| PR | Title | Origin |
|----|-------|--------|
| T-06 | MockProvider + AI test harness | PR-01 |
| T-07 | Extend `ai_requests` schema | PR-02 |
| T-08 | Direct execution default + agent tagging | PR-03–04 |
| T-09 | Unified AI ledger | PR-05 |
| T-10 | Gateway pipeline + circuit breakers | PR-06–07 |
| T-11 | Guardrails + PII middleware | PR-08–09 |

**Exit criteria:** All AI paths guarded; single ledger; CI AI tests ≥70% `lib/ai`.

---

## Phase C — AI product (T-12–T-19)

| PR | Title | Origin |
|----|-------|--------|
| T-12 | Talent OS AI client (`createAiClient()`) | PR-11 |
| T-13 | Prompt platform migration + seeds | PR-16–18 |
| T-14 | Budget aggregates + enforcement (402 optional) | PR-19–21 |
| T-15 | Embedding service + knowledge indexing | PR-22–24 |
| T-16 | Talent semantic match integration | PR-25 |
| T-17 | MCP core adapters (talent, projects, CRM, knowledge) | PR-26–27 |
| T-18 | Agent framework + memory | PR-28–30 |
| T-19 | Deprecate `getAiGateway` | PR-32, PR-42 |

**Exit criteria:** AI matching uses embeddings; agents execute tools; WhatsApp routes through agent framework.

---

## Phase D — Workforce & channel (T-20–T-24)

| PR | Title | Source |
|----|-------|--------|
| T-20 | Deliverable versioning schema + UI | Technical audit |
| T-21 | WhatsApp agent + NLU path | WA gaps |
| T-22 | Agent settings UI (`/settings/agents`) | AF-002 |
| T-23 | Talent keyword search (tsvector upgrade) | Search gap |
| T-24 | AI PM agent tool wiring | Sprint 6 doc |

---

## Phase E — Optional hardening (T-25–T-28)

| PR | Title | When |
|----|-------|------|
| T-25 | Minimal audit capture hook | Before enterprise pilot |
| T-26 | AI quality metrics (basic) | After Phase C |
| T-27 | Provider health + routing policies | After Phase C |
| T-28 | Observability dashboard (read-only) | Ops need |

---

## Explicitly postponed

| Was (83-PR program) | Revisit when |
|---------------------|--------------|
| Billing Platform (PR-B01–B08) | SaaS monetization / Stripe live |
| Feature Flags Platform (PR-FF01–FF08) | >50 orgs or weekly flag changes |
| Search Platform wave (PR-S01–S08) | After T-15/T-16; incremental only |
| Audit Platform wave (PR-A01–A08) | Enterprise compliance deal |
| Workflow Platform (PR-W01–W08) | CRM pipeline redesign required |
| Multi-product registry / namespaces | Never in this repo |

See [docs/Archive/README.md](../Archive/README.md).

---

## Migration numbering

| Migration | PR | Status |
|-----------|-----|--------|
| 001–021 | P0 | On `main` |
| 022_platform_core.sql | T-02 | Single-product (no product registry) — merged in PR #56 |
| 023–028 | Module stack | CRM, org, talent, project, assignment, workflow modules |
| 029_ai_requests_extend.sql | T-07 | AI schema extensions — PR #65 |

---

## Success metrics (Talent OS v1)

| Metric | Target |
|--------|--------|
| CI green on `main` | 100% |
| AI requests via unified ledger | 100% |
| MCP tool success (read tools) | >90% |
| Embedding index lag | <5 min p95 |
| Zero `getAiGateway` outside `lib/ai` | 0 imports |
| Pilot agency onboarded | 1+ |

---

*Active roadmap v1.0.0 — Talent OS single product*
