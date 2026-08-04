# Sprint 3 — AI Product Surface & Cost Control

**Duration:** 3 weeks (~15 working days)  
**PRs:** 17  
**Engineer:** 1 senior full-stack + Cursor / Claude Code  
**Depends on:** Sprint 2 gate (PR-06–10, PR-FF06, PR-A04 merged)

---

## Sprint goal

Deliver the **AI product surface**: routing policies, response cache, **Prompt Platform in Postgres**, and **hybrid cost budgets** (soft alert + hard 402). Complete **feature rollouts and experiments**. Wire **billing usage metering** to AI gateway. Finish **workflow gates + execution bridge**. Begin **embedding API**. Add **saved search alerts**.

---

## Business value

| Outcome | Who benefits |
|---------|--------------|
| Prompts in DB with rollback | Ops — change prompts without deploy |
| USD budgets with 402 enforcement | Finance — control AI spend |
| Budget alerts at 80% | Managers — proactive cost management |
| Provider routing by policy/tier | Enterprise — residency and cost optimization |
| Response cache | Performance + cost savings |
| Usage meters feed billing | Accurate SaaS invoicing path |
| Workflow gates + n8n bridge | Declarative pipeline actions work |
| Feature rollouts / experiments | Product — A/B prompt tests |
| Embedding API | Semantic search unblocked in Sprint 4 |

**Stakeholder narrative:** *"AI is a governed product — prompts, budgets, routing — and usage ties to billing."*

---

## PRs included

| Order | PR | Effort | Risk | Notes |
|-------|-----|--------|------|-------|
| 1 | PR-13 | S | Low | Routing schema 027 |
| 2 | PR-14 | M | Med | After PR-13 |
| 3 | PR-15 | M | Med | After PR-06 |
| 4 | PR-16 | M | Low | Prompt schema 028 |
| 5 | PR-17 | L | Med | After PR-16 |
| 6 | PR-18 | M | Med | After PR-17 |
| 7 | PR-19 | M | Low | Budget schema 026 |
| 8 | PR-20 | M | **High** | After PR-19, PR-B02 |
| 9 | PR-21 | S | Low | After PR-20 |
| 10 | PR-FF04 | M | Med | After PR-FF06 |
| 11 | PR-FF05 | L | Med | After PR-FF04 |
| 12 | PR-B04 | L | Med | After PR-19, PR-02 |
| 13 | PR-W05 | M | Med | After PR-W03, PR-A04 |
| 14 | PR-W06 | L | Med | After PR-W03 |
| 15 | PR-S06 | M | Low | After PR-S05 |
| 16 | PR-22 | M | Low | After PR-01 |
| 17 | PR-23 | M | Med | After PR-22, PR-11 |

**Critical path this sprint:** PR-16 → PR-17 → PR-18 and PR-19 → PR-20 → PR-21

---

## Dependencies

| Dependency | From | Required for |
|------------|------|--------------|
| PR-06 | Sprint 2 | PR-15 (cache in pipeline) |
| PR-B02 | Sprint 1 | PR-20 (plan entitlements for budgets) |
| PR-FF06 | Sprint 2 | PR-FF04, FF05 |
| PR-W03 | Sprint 2 | PR-W05, PR-W06 |
| PR-A04 | Sprint 2 | PR-W05 (audit on transitions) |
| PR-11 | Sprint 2 | PR-23 |

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| PR-20 blocks AI for customers | Medium | Critical | `hard_limit=false` default; soft-only week 1 prod |
| PR-17 prompt migration wrong hash | Medium | High | Snapshot hash test vs baseline |
| PR-B04 double usage count | Medium | Med | Idempotency keys; integration test |
| PR-W06 execution refactor | Medium | Med | Re-export `@/lib/workflows`; no delete |
| PR-FF05 experiment misconfig | Low | Med | 100% control default |

---

## Rollback strategy

| PR | Rollback |
|----|----------|
| PR-17–18 | `AI_PROMPT_DB_ENABLED=false` → in-memory prompts |
| PR-20 | `AI_BUDGET_HARD_LIMIT=false` globally; disable budget check middleware |
| PR-21 | Disable alert cron rule |
| PR-14 | Empty routing table → env fallback chain |
| PR-15 | `AI_RESPONSE_CACHE_ENABLED=false` |
| PR-B04 | Stop usage hooks; no invoice impact until Sprint 4 |
| PR-W06 | Revert bridge; registry-only workflows |
| PR-FF04–05 | Disable rollouts/experiments; env defaults only |

---

## Test plan

| Area | Tests |
|------|-------|
| Routing | Policy selection by tier; fallback (PR-14) |
| Cache | Hit/miss; TTL expiry (PR-15) |
| Prompts | DB resolve; org override; rollback (PR-17) |
| Prompt dedupe | Hash unchanged vs baseline (PR-18) |
| Budget | Under soft → pass; over hard → 402; hard off → pass (PR-20) |
| Alerts | 80% threshold creates alert row (PR-21) |
| Usage | Idempotent meter; aggregate sums (PR-B04) |
| Rollout | Stable bucket; allowlist (PR-FF04) |
| Experiment | Variant assignment; exposure event (PR-FF05) |
| Workflow | Approval gate blocks; bridge enqueues job (PR-W05, W06) |
| Embed | Mock 1536-dim vector (PR-22, PR-23) |
| Saved search | Alert fires on new match (PR-S06) |

---

## Release plan

| Step | Action |
|------|--------|
| Staging week 1 | Prompt DB + routing + cache |
| Staging week 2 | Budget **soft alerts only** |
| Staging week 3 | Budget hard 402 for test org only |
| Prod pilot | Soft alerts all tenants; hard limit opt-in |
| Prod | No Stripe yet — usage records only |

---

## Success metrics

| Metric | Target |
|--------|--------|
| PRs merged | 17 / 17 |
| Prompt rollback time | <1 min via assignment update |
| Budget alert latency | <1 min (PR-21) |
| 402 behavior | Correct per org hard_limit flag |
| Usage idempotency | 0 duplicate meters in retry test |
| Workflow bridge | Existing cron jobs still process |
| lib/ai test coverage | ≥50% cumulative |

---

## Demo checklist

- [ ] Change prompt version in DB → gateway uses new version (PR-17)  
- [ ] Roll back prompt via assignment → previous version active  
- [ ] Exceed 80% AI budget → alert in observability dashboard (PR-21)  
- [ ] Exceed 100% with hard limit → 402 response (PR-20, test org)  
- [ ] Route enterprise org to Azure when policy configured (PR-14)  
- [ ] Repeat identical completion → cache hit (PR-15)  
- [ ] AI request → usage meter `ai.cost_usd` incremented (PR-B04)  
- [ ] 25% rollout → ~25% orgs see feature enabled (PR-FF04)  
- [ ] Experiment assigns variant; exposure event in catalog (PR-FF05)  
- [ ] Workflow transition fires notify + n8n job (PR-W06)  
- [ ] Saved search alert email/notification on new knowledge match (PR-S06)  
- [ ] `aiPlatform.embed()` returns vector (PR-23)  

---

## Carry-over protocol

Defer order: PR-S06 → PR-FF05 → PR-18. Never defer PR-19, PR-20, PR-17.

---

*Sprint 3 of 5 — see [ENGINEERING_EXECUTION_PLAN.md](./ENGINEERING_EXECUTION_PLAN.md)*
