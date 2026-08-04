# Sprint 2 — Secure AI Gateway

**Duration:** 3 weeks (~15 working days)  
**PRs:** 16  
**Engineer:** 1 senior full-stack + Cursor / Claude Code  
**Depends on:** Sprint 1 gate (PR-00, PR-01, PR-05 merged)

---

## Sprint goal

Make the **AI gateway production-safe**: extracted pipeline, circuit breakers, input/output guardrails, PII redaction. Complete **audit capture** on mutations (actor, source, before/after). Deliver **Feature Flag evaluation** and **seat enforcement**. Start **AI Platform client** and **Azure OpenAI**. Wire **workflow transition engine** and **declarative definition loader**.

---

## Business value

| Outcome | Who benefits |
|---------|--------------|
| Guardrails block prompt injection and unsafe outputs | Enterprise security review; SOC 2 path |
| PII redacted before LLM calls | GDPR/compliance |
| Circuit breakers prevent provider cascade failures | Production stability |
| Audit trail on payment/project mutations | Admin forensics; compliance |
| Feature flags evaluable with kill switches | Safe progressive rollout in Sprint 3+ |
| Seat caps enforced | Revenue protection (billing) |
| AI Platform client replaces ad-hoc gateway imports | Developer experience |
| Workflow transitions executable (behind flag) | Foundation for declarative pipeline |

**Stakeholder narrative:** *"AI is governed — guardrails, audit, and circuit breakers — and we can control rollout with feature flags."*

---

## PRs included

| Order | PR | Effort | Risk | Notes |
|-------|-----|--------|------|-------|
| 1 | PR-06 | L | Med | After PR-05 |
| 2 | PR-07 | M | Med | After PR-06 |
| 3 | PR-08 | M | **High** | After PR-06 |
| 4 | PR-09 | M | **High** | After PR-08 |
| 5 | PR-10 | M | Med | After PR-09 |
| 6 | PR-A03 | M | Med | After PR-A02 |
| 7 | PR-A04 | L | Med | After PR-A03 |
| 8 | PR-A05 | M | **High** | Align with PR-05; after PR-A02 |
| 9 | PR-FF03 | M | Med | After PR-FF02, PR-B02 |
| 10 | PR-FF06 | L | Med | After PR-FF03 |
| 11 | PR-B03 | M | Med | After PR-B02 |
| 12 | PR-S05 | M | Low | After PR-S02 |
| 13 | PR-W03 | L | **High** | After PR-W02 |
| 14 | PR-W04 | M | Low | After PR-W01 |
| 15 | PR-11 | M | Low | After PR-00, PR-01 |
| 16 | PR-12 | M | Med | After PR-11 |

**Recommended sequence:**

Week 1: PR-06 → PR-07 → PR-08 (guardrails first — highest risk)  
Week 2: PR-09 → PR-10 → PR-A03 → PR-A04 → PR-A05  
Week 3: PR-FF03 → PR-FF06 → PR-B03 → PR-S05 → PR-W04 → PR-W03 → PR-11 → PR-12  

---

## Dependencies

| Dependency | From | Required for |
|------------|------|--------------|
| PR-00, PR-01, PR-05 | Sprint 1 | PR-06, PR-11, PR-A05 |
| PR-A02 | Sprint 1 | PR-A03–A05 |
| PR-B02 | Sprint 1 | PR-FF03 (entitlements), PR-B03 |
| PR-FF02 | Sprint 1 | PR-FF03, PR-FF06 |
| PR-S02 | Sprint 1 | PR-S05 |
| PR-W01, PR-W02 | Sprint 1 | PR-W03, PR-W04 |
| Azure credentials | Infra | PR-12 — staging only |

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Guardrails block legitimate briefs | High | High | `AI_GUARDRAILS_ENABLED` flag; tune rules; tenant allowlist |
| PR-06 pipeline refactor breaks agents | Medium | High | Feature flag; extensive gateway unit tests |
| PR-A04 touches all entry points | Medium | Med | Pilot on payments + projects only |
| PR-W03 transition bugs | Medium | High | `process.declarative.enabled=false`; dry-run mode |
| Sprint overload | Medium | High | Defer PR-12 to Sprint 3 if week 3 compressed |

---

## Rollback strategy

| PR | Rollback |
|----|----------|
| PR-06–10 | Env flags: `AI_GUARDRAILS_ENABLED=false`, `AI_PII_REDACTION_ENABLED=false`, disable circuit breaker |
| PR-08–10 | Per-feature kill switches `FEATURE_KILL_ai.*` |
| PR-A03–A05 | Stop audit writes; revert repo hooks; AI path reverts to PR-05 only |
| PR-FF06 | Bypass cache — read DB directly |
| PR-B03 | Disable seat check on invite — env `BILLING_SEAT_ENFORCE=false` |
| PR-W03 | `process.declarative.enabled=false` |
| PR-11–12 | Revert to `getAiGateway()` imports (still available until Sprint 5) |

---

## Test plan

| Area | Tests |
|------|-------|
| Pipeline | Unit: stage order, error propagation (PR-06) |
| Circuit breaker | Unit: open after N failures; Redis state (PR-07) |
| Guardrails | Unit: injection patterns blocked; normal text passes (PR-08) |
| PII | Unit: email/phone redacted; hash preserved (PR-09) |
| Output | Unit: schema repair; unsafe output blocked (PR-10) |
| Audit | Integration: payment update → audit row with before/after (PR-A03) |
| AI audit | Integration: single ai_requests + audit link (PR-A05) |
| Feature flags | Unit: precedence, kill switch, entitlement deny (PR-FF03, FF06) |
| Seats | Unit: at-cap invite rejected (PR-B03) |
| Workflow | Unit: transition valid/invalid; gate block (PR-W03) |
| Azure | Mock HTTP; optional live smoke in staging (PR-12) |
| Regression | Full `npm run test:all` + Playwright E2E |

**High-risk PRs require manual QA checklist before merge** (PR-08, PR-09, PR-W03).

---

## Release plan

| Step | Environment | Scope |
|------|-------------|-------|
| 1 | Staging | PR-06–10 with guardrails **monitor-only** (log, don't block) week 2 |
| 2 | Staging | Enable blocking guardrails week 3 |
| 3 | Prod pilot | 1 tenant with guardrails + audit on |
| 4 | Prod | Do not enable seat enforcement until comms ready |

**Monitor-only mode:** Guardrails log violations but do not reject — validate false positive rate for 3–5 days.

---

## Success metrics

| Metric | Target |
|--------|--------|
| PRs merged | 16 / 16 (PR-12 optional carry to Sprint 3) |
| Guardrail coverage | 100% gateway paths |
| False positive rate (guardrails) | <2% on sample brief corpus |
| Audit records on pilot repos | 100% payment/project updates |
| Feature flag eval p99 | <25ms uncached, <5ms cached |
| ai_requests duplicate writes | 0 |
| E2E suite | Green |

---

## Demo checklist

- [ ] Send malicious prompt → guardrail blocks with 403 (staging)  
- [ ] Send normal talent brief → passes guardrails, completes match  
- [ ] Show PII redacted in logs (email → `[REDACTED_EMAIL]`)  
- [ ] Trip circuit breaker (mock provider failures) → fallback provider used  
- [ ] Approve payment → audit timeline shows before/after status  
- [ ] AI request → one ledger row + audit `ai.request_complete`  
- [ ] `FEATURE_KILL_ai.matching=true` → matching disabled instantly  
- [ ] Entitlement: org without ai_matching in plan → blocked even with override attempt  
- [ ] Invite 3rd user on 2-seat plan → rejected (PR-B03)  
- [ ] `platform.process.advance({ transitionKey: 'lead_qualify' })` dry-run (PR-W03, flag on)  
- [ ] `platform.features.evaluate('ai.matching')` returns reason (PR-FF06)  
- [ ] AI Platform client: `aiPlatform.complete()` via SDK (PR-11)  
- [ ] Azure provider routes when env configured (PR-12, optional)  

---

## Carry-over protocol

Priority deferral order: PR-12 → PR-S05 → PR-W04. Never defer PR-06–10 or PR-A04.

---

*Sprint 2 of 5 — see [ENGINEERING_EXECUTION_PLAN.md](./ENGINEERING_EXECUTION_PLAN.md)*
