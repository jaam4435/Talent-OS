# Sprint 5 — Production Platform & GA Hardening

**Duration:** 3 weeks (~15 working days)  
**PRs:** 17  
**Engineer:** 1 senior full-stack + Cursor / Claude Code  
**Depends on:** Sprint 4 gate (PR-24, PR-B06, PR-S07, PR-W07 merged)

---

## Sprint goal

**Complete all platform waves** (audit export, billing API, feature flags admin, search migration, workflow cutover). Finish **AI client migration** and **multi-product namespaces**. Deliver **quality/optimization** PRs (eval CI, cost routing, streaming accuracy). **Deprecate `getAiGateway`**. Achieve **platform GA** readiness.

---

## Business value

| Outcome | Who benefits |
|---------|--------------|
| Full platform admin APIs | Ops — configure without SQL |
| Audit export | Compliance / SOC 2 evidence |
| Workflow declarative cutover | No hard-coded status jumps |
| AI quality reporting | Trust in AI outputs |
| Cost optimization routing | Lower AI bills |
| Single public AI API | Clean developer contract |
| Production readiness ≥8.5/10 | Enterprise sales |

**Stakeholder narrative:** *"All six platform capabilities are live, AI is migrated, and we're GA-ready."*

---

## PRs included

| Order | PR | Effort | Risk | Notes |
|-------|-----|--------|------|-------|
| 1 | PR-31 | S | Low | AI feature namespaces |
| 2 | PR-32 | M | Med | Migrate to platform client |
| 3 | PR-A06 | L | Med | Audit domain expansion |
| 4 | PR-A07 | M | Low | Audit query + export |
| 5 | PR-A08 | M | Low | Audit observability |
| 6 | PR-FF08 | M | Low | Feature flags admin API |
| 7 | PR-B08 | M | Low | Billing admin API |
| 8 | PR-S08 | M | Med | Knowledge → search platform |
| 9 | PR-W08 | L | **High** | Workflow cutover — **highest risk** |
| 10 | PR-35 | M | Low | Prompt eval CI |
| 11 | PR-36 | M | Low | Quality reporting |
| 12 | PR-37 | M | Med | Cost optimization routing |
| 13 | PR-38 | M | Low | Embedding namespaces |
| 14 | PR-39 | M | Med | Match context compression |
| 15 | PR-40 | S | Low | Streaming usage accuracy |
| 16 | PR-41 | M | Low | OTel export (optional) |
| 17 | PR-42 | S | Med | Deprecate getAiGateway |

**Recommended sequence:**

Week 1: PR-31 → PR-32 → PR-A06 → PR-A07 → PR-FF08 → PR-B08  
Week 2: PR-S08 → PR-W08 (flagged rollout) → PR-A08  
Week 3: PR-35 → PR-36 → PR-37 → PR-38 → PR-39 → PR-40 → PR-41 → PR-42  

**PR-W08:** Deploy week 2 staging; prod week 3 with `process.declarative.enabled` per org.

---

## Dependencies

| Dependency | From | Required for |
|------------|------|--------------|
| PR-28, PR-32 prep | Sprint 4 | PR-42 |
| PR-11, PR-17 | Sprint 2–3 | PR-32 |
| PR-A04 | Sprint 2 | PR-A06 |
| PR-S07 | Sprint 4 | PR-S08 |
| PR-W07 | Sprint 4 | PR-W08 |
| PR-17 | Sprint 3 | PR-35 |

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| PR-W08 breaks project flow | Medium | Critical | Per-org flag; backfill; parity tests |
| PR-42 breaks internal imports | Medium | Med | Codemod + deprecation period |
| PR-32 migration incomplete | Medium | High | grep for getAiGateway before merge |
| Sprint 5 overload | High | Med | PR-41 optional; PR-39 defer if needed |
| GA sign-off pressure | Medium | Med | Readiness report factual — no fake GA |

---

## Rollback strategy

| PR | Rollback |
|----|----------|
| PR-W08 | `process.declarative.enabled=false`; restore service status updates |
| PR-S08 | KnowledgeService direct RPC reads |
| PR-32, PR-42 | Re-export getAiGateway temporarily |
| PR-B08, FF08, A07 | Admin APIs disabled via route middleware |
| PR-37 | Disable cost optimization policy |
| Full sprint | Revert merges in reverse order; flags off all platforms |

**PR-W08 rollback drill:** Document in runbook before prod enable.

---

## Test plan

| Area | Tests |
|------|-------|
| Platform APIs | Integration tests all admin routes (A07, FF08, B08) |
| Audit export | CSV date range; entity timeline (PR-A07) |
| Search migration | Knowledge parity vs legacy (PR-S08) |
| Workflow | Playwright critical workflows; parity suite (PR-W08) |
| Client migration | Zero getAiGateway outside lib/ai (PR-42 lint) |
| Eval CI | Golden dataset pass in CI (PR-35) |
| Quality | Feedback → report RPC (PR-36) |
| Cost routing | Cheaper model when optimizing (PR-37) |
| Streaming | Token count accuracy (PR-40) |
| Full regression | `npm run test:all` + E2E + migration apply on fresh DB |

**GA gate:** Run [PRODUCTION_CHECKLIST.md](../../PRODUCTION_CHECKLIST.md) fully.

---

## Release plan

| Step | When | Action |
|------|------|--------|
| 1 | Week 1 | Staging: all platform admin APIs |
| 2 | Week 2 | Staging: PR-W08 on; full regression |
| 3 | Week 2 | Prod: platform APIs (admin only) |
| 4 | Week 3 | Prod: `process.declarative.enabled` pilot org |
| 5 | Week 3 | Prod: PR-42 deprecation warning in logs |
| 6 | Week 3 + 1 | **GA milestone M5** — readiness report v4 |

**Post-GA (not this sprint):** Billing UI, process board UI, feature flags admin UI.

---

## Success metrics

| Metric | Target |
|--------|--------|
| PRs merged | 17 / 17 (PR-41 optional) |
| Platform wave completion | All 8×6 acceptance criteria met |
| AI platform maturity | ≥85% |
| Production readiness | ≥8.5/10 |
| getAiGateway external imports | 0 |
| Workflow parity tests | 100% pass |
| Audit export | Admin can export 30-day CSV |
| lib/ai test coverage | ≥70% |
| OpenAPI | All new routes documented |

---

## Demo checklist (GA demo — 45 min)

### Platform APIs
- [ ] Export audit log CSV for date range (PR-A07)  
- [ ] Create org feature override via API (PR-FF08)  
- [ ] List subscription + usage via billing API (PR-B08)  
- [ ] Unified search query hybrid mode (PR-S08)  

### Workflow
- [ ] Start process at lead → advance to opportunity → proposal (PR-W08)  
- [ ] Show pipeline board with instances per stage  
- [ ] Milestone QA gate still works via declarative transition  

### AI
- [ ] All calls via `aiPlatform.*` — no getAiGateway (PR-32, PR-42)  
- [ ] Prompt eval CI badge green in GitHub (PR-35)  
- [ ] Quality report shows feedback aggregates (PR-36)  
- [ ] Cost optimizer routes low-priority feature to flash model (PR-37)  

### Compliance
- [ ] Audit record for subscription change with before/after  
- [ ] AI request audit without raw prompt in snapshot  
- [ ] Append-only audit — update attempt fails  

### Readiness
- [ ] Walk through PRODUCTION_READINESS_REPORT v4 scores  
- [ ] CI pipeline green: test, lint, build, security scan  
- [ ] Migration 022–034 apply clean on fresh database  

**Closing statement:** *"83 PRs complete — Platform Core plus Billing, Feature Flags, Search, Audit, Workflow, and governed AI."*

---

## Post-sprint backlog (explicitly out of scope)

| Item | Notes |
|------|-------|
| Platform admin UI | Phase 2 product |
| Billing UI `/settings/billing` | Phase 2 |
| External vector DB | Scale trigger only |
| SSO/MFA | Separate initiative |

---

## Carry-over protocol

Only **PR-41** (OTel) and **PR-39** (compression) may slip post-GA without blocking M5. **PR-W08** and **PR-42** must not slip.

---

*Sprint 5 of 5 — see [ENGINEERING_EXECUTION_PLAN.md](./ENGINEERING_EXECUTION_PLAN.md)*
