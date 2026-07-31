# Sprint 1 — Platform Bedrock

**Duration:** 3 weeks (~15 working days)  
**PRs:** 16  
**Engineer:** 1 senior full-stack + Cursor / Claude Code  
**Depends on:** P0 production blockers merged on `main` (migrations 001–021, CI green)

---

## Sprint goal

Establish **Platform Core** and **parallel schema foundations** for AI, Audit, Billing, Feature Flags, Search, and Workflow — plus complete **AI Wave 0** (test harness, schema, direct execution, unified ledger). Every subsequent sprint builds on this sprint's SDK and migrations 022–025, 032–034.

---

## Business value

| Outcome | Who benefits |
|---------|--------------|
| Single `@/modules/platform` SDK and org context | All future platform PRs; reduces duplicate types |
| CI-safe AI testing (MockProvider) | Engineering velocity; no live API spend in CI |
| Unified AI ledger (no dual write path start) | Finance, compliance — accurate cost attribution |
| Declarative platform tables exist (billing, flags, search, audit, workflow) | Unblocks sprints 2–5 without schema rework |
| Keyword search works for talent + knowledge | Managers find roster and knowledge faster |
| Lead/Proposal entities + process definition seeded | CRM pipeline foundation |

**Investor/stakeholder narrative:** *"We built the operating system layer — one SDK, one ledger, six platform schemas — and secured the AI foundation."*

---

## PRs included

| Order | PR | Effort | Risk | Notes |
|-------|-----|--------|------|-------|
| 1 | **PR-00** | L | Med | **Gate PR** — nothing else starts until merged |
| 2 | PR-01 | M | Low | After PR-00 |
| 3 | PR-02 | M | Med | After PR-00; migration 023 |
| 4 | PR-03 | S | Med | After PR-01 |
| 5 | PR-04 | S | Low | After PR-00 |
| 6 | PR-05 | M | Med | After PR-02 |
| 7 | PR-A01 | M | Med | After PR-00; migration 033 |
| 8 | PR-A02 | M | Low | After PR-A01 |
| 9 | PR-B01 | M | Med | After PR-00; migration 024 |
| 10 | PR-B02 | M | Med | After PR-B01 |
| 11 | PR-FF01 | M | Low | After PR-00; migration 025 |
| 12 | PR-FF02 | M | Low | After PR-FF01 |
| 13 | PR-S01 | M | Low | After PR-00; migration 032 |
| 14 | PR-S02 | M | Med | After PR-S01 |
| 15 | PR-W01 | M | Med | After PR-00; migration 034 |
| 16 | PR-W02 | M | Low | After PR-W01 |

**Parallelization (after PR-00 merges, week 2–3):**

- Track A: PR-01 → PR-02 → PR-03 → PR-04 → PR-05  
- Track B: PR-A01 → PR-A02  
- Track C: PR-B01 → PR-B02  
- Track D: PR-FF01 → PR-FF02  
- Track E: PR-S01 → PR-S02  
- Track F: PR-W01 → PR-W02  

With one engineer: finish Track A first (days 1–8), then parallelize B–F (days 9–15) using AI for migrations/repos.

---

## Dependencies

| Dependency | Type | Action |
|------------|------|--------|
| PR-00 | Internal | Must merge day 5–8 |
| Migrations 001–021 on staging | External | Verify `supabase db push` before 022 |
| Redis (Upstash) | External | Required for PR-FF06 in Sprint 2 — confirm env in staging |
| No UI work | Scope | Defer `/settings/billing` UI |

**Downstream sprints blocked without:** PR-00, PR-01, PR-05, PR-A01, PR-B02, PR-FF01, PR-S01, PR-W01.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| PR-00 takes full sprint | Medium | Critical | Timebox to 5 days; cut nice-to-have docs to PR follow-up |
| Migration number conflicts | Low | Medium | Use fixed map in ENGINEERING_EXECUTION_PLAN |
| Talent FTS behavior change (PR-S02) | Medium | Medium | Feature flag `search.talent_fts`; ILIKE fallback |
| Too many PRs for 3 weeks | Medium | High | AI scaffold migrations; merge schema PRs without full feature completion where acceptable |
| PLATFORM_CORE.md not written | Low | Low | Accept draft in PR-00 or add doc-only commit |

---

## Rollback strategy

| PR group | Rollback procedure |
|----------|-------------------|
| PR-00 | Revert branch; migration 022 down if applied; restore imports to core context |
| PR-01–05 | Revert AI PRs independently; PR-03: set `AI_EXECUTION_MODE=n8n` |
| Platform schemas (B01, FF01, S01, A01, W01) | Migrations are additive — rollback = stop reading new tables; no drop in prod until Sprint 5 |
| PR-S02 | Set `search.talent_fts=false` → ILIKE path |
| PR-B02 backfill | Script is idempotent; re-run after fix |

**Sprint rollback (nuclear):** Revert all Sprint 1 merges; keep migrations if data written — feature flags off all platform reads.

---

## Test plan

| Layer | Tests | PRs |
|-------|-------|-----|
| Unit | Platform SDK, product registry, config precedence, feature flag MVP | PR-00, FF01–02 |
| Unit | MockProvider, gateway smoke | PR-01 |
| Integration | Migration applies; RLS cross-tenant block | All schema PRs |
| Integration | Ledger single write | PR-05 |
| Integration | Keyword search parity | PR-S02 |
| E2E | Existing Playwright suite green | Every merge |
| Manual | `createPlatformClient({ productId: 'talent_os' })` in REPL | PR-00 |

**Sprint exit criteria:**

- [ ] `npm run test:all` green on `main`  
- [ ] Migrations 022–025, 032–034 apply on clean staging DB  
- [ ] ≥15 platform unit tests (PR-00)  
- [ ] ≥5 AI unit tests (PR-01)  
- [ ] No new P0 linter/type errors  

---

## Release plan

| Step | When | Action |
|------|------|--------|
| 1 | End week 2 | Deploy to **staging** after PR-00 + PR-01 |
| 2 | End week 3 | Deploy full sprint to **staging** |
| 3 | Sprint demo | Staging walkthrough — no prod |
| 4 | Prod | **Do not deploy** platform schemas to prod until Sprint 2 guardrails ready — OR deploy with all reads disabled |

**Feature flags (staging):**

- `PLATFORM_SDK_ENABLED=true`  
- `search.talent_fts=false` (until validated)  
- All billing/audit/workflow/process flags **off** for user-facing paths  

---

## Success metrics

| Metric | Target |
|--------|--------|
| PRs merged | 16 / 16 |
| PR-00 acceptance criteria | 100% checklist |
| Platform unit tests | ≥15 |
| AI unit tests | ≥5 |
| Dual ai_requests write paths | 0 new duplicates introduced |
| Staging migration apply | 0 errors |
| Sprint velocity | ≥14 PRs merged (allow 2 carry-over) |

---

## Demo checklist

Prepare for stakeholder demo (30 min, staging):

- [ ] Show `@/modules/platform` exports — ProductId, OrganizationContext, SDK factory  
- [ ] Show product registry: 3 products, `talent_os` enabled  
- [ ] Run `npm test` — AI MockProvider tests pass, no network  
- [ ] Show migration list 022–034 in Supabase dashboard  
- [ ] Query `billing_plans` seed — starter/pro/enterprise rows  
- [ ] Query `feature_definitions` seed — ai.matching, whatsapp.enabled  
- [ ] Keyword search: knowledge full-text returns ranked results  
- [ ] Keyword search: talent search API returns results (manager auth)  
- [ ] Show `process_definitions` seeded pipeline JSON (8 stages)  
- [ ] Show `audit_records` table exists + immutability trigger (insert-only demo)  
- [ ] Show `leads` / `proposals` tables — create sample row via SQL  
- [ ] AI gateway: one talent_match call logged once in `ai_requests` (PR-05)  

**Demo script anchor:** *"One SDK, six platforms seeded, AI ledger unified — foundation for everything else."*

---

## Daily breakdown (suggested)

| Days | Focus |
|------|-------|
| 1–5 | PR-00 (Platform Core) — review RLS manually |
| 6–8 | PR-01, PR-02, PR-03, PR-04 |
| 9 | PR-05 |
| 10–11 | PR-A01, PR-A02, PR-B01, PR-B02 (AI-assisted migrations) |
| 12–13 | PR-FF01, PR-FF02, PR-S01, PR-S02 |
| 14–15 | PR-W01, PR-W02, buffer, demo prep |

---

## Carry-over protocol

If >2 PRs slip: carry **PR-W02** and **PR-S02** to Sprint 2 first (lowest downstream dependency). Do **not** carry PR-00, PR-01, or PR-05.

---

*Sprint 1 of 5 — see [ENGINEERING_EXECUTION_PLAN.md](./ENGINEERING_EXECUTION_PLAN.md)*
