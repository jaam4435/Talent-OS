# Sprint 4 — Intelligence, Search & Revenue

**Duration:** 3 weeks (~15 working days)  
**PRs:** 17  
**Engineer:** 1 senior full-stack + Cursor / Claude Code  
**Depends on:** Sprint 3 gate (PR-19–20, PR-23, PR-W06 merged)

---

## Sprint goal

Ship **end-to-end intelligence**: embedding indexing, semantic + **hybrid search**, MCP agent tools, memory platform. Complete **billing invoices + Stripe + subscription middleware**. Deliver **workflow process API and pipeline board**. Migrate **AI feature flags** off tenant.settings. Add **provider health** and **AI trace spans**.

---

## Business value

| Outcome | Who benefits |
|---------|--------------|
| Knowledge semantic + hybrid search | Managers — find content by meaning |
| Embedding index lag <5 min | RAG-quality knowledge retrieval |
| MCP agents call real read tools | Agent framework production value |
| Memory across agent sessions | Better AI continuity |
| Stripe checkout + webhooks | SaaS revenue collection |
| Subscription middleware enforcement | Plan compliance |
| Process board API | Pipeline visibility Lead → Invoice |
| Provider health dashboard | Ops — know when OpenAI is down |
| AI flags migrated | Single flag platform |

**Stakeholder narrative:** *"Intelligent search, agent tools, and revenue collection — the platform earns and delivers."*

---

## PRs included

| Order | PR | Effort | Risk | Notes |
|-------|-----|--------|------|-------|
| 1 | PR-24 | L | Med | After PR-23 — **blocks search semantic** |
| 2 | PR-25 | M | Low | After PR-24 |
| 3 | PR-S03 | M | Med | After PR-24 |
| 4 | PR-S04 | M | Low | After PR-S02, PR-S03 |
| 5 | PR-S07 | L | Med | After PR-S04, PR-S05 |
| 6 | PR-B05 | M | Low | After PR-B04, PR-B03 |
| 7 | PR-B06 | L | **High** | After PR-B05 |
| 8 | PR-B07 | M | **High** | After PR-B06 |
| 9 | PR-W07 | L | Med | After PR-W05, PR-W06 |
| 10 | PR-26 | L | Med | MCP framework |
| 11 | PR-27 | L/XL | Med | After PR-26 — may split |
| 12 | PR-28 | M | Med | After PR-26, PR-25, PR-11 |
| 13 | PR-29 | M | Med | Memory schema 029 |
| 14 | PR-30 | L | Med | After PR-29 |
| 15 | PR-33 | M | Low | Trace spans |
| 16 | PR-FF07 | M | **High** | After PR-FF06, PR-04 |
| 17 | PR-34 | M | Low | Provider health |

**Week 1 priority:** PR-24 → PR-S03 → PR-S04 (search path)  
**Week 2 priority:** PR-B05 → PR-B06 → PR-B07 (billing — manual QA heavy)  
**Week 3 priority:** PR-26 → PR-27 → PR-28, PR-W07, PR-29 → PR-30

---

## Dependencies

| Dependency | From | Required for |
|------------|------|--------------|
| PR-23 | Sprint 3 | PR-24 |
| PR-24 | This sprint | PR-25, PR-S03, PR-S04 |
| PR-S05 | Sprint 2 | PR-S07 |
| PR-B04 | Sprint 3 | PR-B05 |
| PR-W05, W06 | Sprint 3 | PR-W07 |
| PR-11 | Sprint 2 | PR-28 |
| Stripe test account | Infra | PR-B06 |

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| PR-B06 payment bugs | Medium | Critical | Stripe test mode; webhook idempotency; no prod until checklist |
| PR-B07 locks out tenants | Medium | High | Grace period; billing-only redirect |
| PR-27 scope too large | High | Med | Split: CRM+workflow week 3, finance+notifications carry Sprint 5 |
| PR-FF07 breaks AI features | Medium | High | Dual-read tenant.settings fallback 2 weeks |
| Embedding lag | Medium | Med | Monitor `embedding_status`; cron concurrency |

---

## Rollback strategy

| PR | Rollback |
|----|----------|
| PR-24–25 | Stop indexing cron; keyword-only search |
| PR-S03–S07 | `search.semantic.enabled=false`; `search.hybrid.enabled=false` |
| PR-B06–07 | Disable webhook route; restore JSON subscription in settings |
| PR-B07 | `SUBSCRIPTION_MIDDLEWARE_ENABLED=false` |
| PR-W07 | Hide process API; no UI |
| PR-26–28 | Disable MCP agent tools feature flag |
| PR-FF07 | `tenant.settings.features` fallback read |
| PR-29–30 | Memory reads return empty |

---

## Test plan

| Area | Tests |
|------|-------|
| Embedding | Index job pending→indexed; retry failed (PR-24) |
| Semantic | Vector search returns hits (PR-25, S03) |
| Hybrid | RRF ordering unit test (PR-S04) |
| Search API | Unified query both indices (PR-S07) |
| Invoice | Line items match usage (PR-B05) |
| Stripe | Webhook signature; payment_failed → past_due (PR-B06) |
| Middleware | past_due → billing redirect (PR-B07) |
| Process API | advance + board columns (PR-W07) |
| MCP | ≥3 read tools E2E agent test (PR-28) |
| Memory | Store/recall scoped by org (PR-30) |
| Flags | AI gateway uses platform evaluate (PR-FF07) |
| Health | Provider probe metrics (PR-34) |

**PR-B06 manual QA:** Full checkout → webhook → subscription active (Stripe CLI).

---

## Release plan

| Step | Environment | Notes |
|------|-------------|-------|
| 1 | Staging | Embeddings + hybrid search on |
| 2 | Staging | Stripe test mode checkout |
| 3 | Prod pilot | Hybrid search for 1 org |
| 4 | Prod pilot | Stripe live for 1 org OR remain test until Sprint 5 |
| 5 | Prod | Subscription middleware soft launch (warn, don't block) week 3 |

---

## Success metrics

| Metric | Target |
|--------|--------|
| PRs merged | 17 / 17 (PR-27 may partial) |
| Embedding index lag p95 | <5 min |
| Hybrid search p95 | <600ms |
| MCP agent tool success | >90% read tools (PR-28) |
| Stripe webhook idempotency | 100% |
| Process board API | 8 columns populated |
| Zero tenant.settings AI flag reads in lib/ai | PR-FF07 |

---

## Demo checklist

- [ ] Create knowledge entry → indexed within 5 min → hybrid search finds it  
- [ ] Compare keyword vs hybrid results for same query  
- [ ] `POST /api/search/query` unified endpoint (PR-S07)  
- [ ] Stripe Checkout session → test payment → subscription active (PR-B06)  
- [ ] past_due tenant redirected to billing (PR-B07, staging)  
- [ ] Process board: instances grouped by stage (PR-W07)  
- [ ] Advance lead → opportunity via API (PR-W07)  
- [ ] Agent invokes MCP read tool successfully (PR-28)  
- [ ] Agent memory persists across turns (PR-30)  
- [ ] Provider health metric visible (PR-34)  
- [ ] AI trace sub-spans in observability RPC (PR-33)  
- [ ] Feature flag kill switch disables matching instantly (PR-FF07)  

---

## Carry-over protocol

If overloaded: split PR-27 — carry finance+notification adapters to Sprint 5. Never defer PR-24, PR-B06, PR-S07.

---

*Sprint 4 of 5 — see [ENGINEERING_EXECUTION_PLAN.md](./ENGINEERING_EXECUTION_PLAN.md)*
