# Release Notes — AI Platform Phase B (Security & Integrity)

**Version:** 0.3.0  
**Date:** August 2, 2026  
**Branch:** `cursor/ai-pr-phase-b-foundation-5fb1`  
**Roadmap:** [AI_IMPLEMENTATION_ROADMAP.md](./docs/Archive/AI_IMPLEMENTATION_ROADMAP.md) PR-01–PR-09 → [TALENT_OS_IMPLEMENTATION_ROADMAP.md](./docs/Architecture/TALENT_OS_IMPLEMENTATION_ROADMAP.md) T-06–T-11

## Summary

Implements AI Platform Phase B: CI-safe testing, extended AI ledger schema, direct execution default, unified request logging, gateway pipeline refactor, circuit breakers, input guardrails, and PII redaction.

**No breaking API changes.** Existing `getAiGateway()` entry point preserved.

---

## T-06 / PR-01 — MockProvider + test harness

- Added `lib/ai/providers/mock.provider.ts` for deterministic CI output
- Added `tests/unit/ai/mock-provider.test.ts` (9 tests)
- Zero live provider calls required in CI

## T-07 / PR-02 — Extended `ai_requests` schema

- Migration `029_ai_requests_extend.sql`
- New columns: `product_id` (default `talent_os`), `prompt_version`
- Extended `ai_provider` enum: `gemini`, `openrouter`, `azure_openai`, `mock`

## T-08 / PR-03–04 — Direct execution + agent tagging

- Default async AI path is in-process (`AI_EXECUTION_MODE` unset or not `n8n`)
- Agent reasoning calls tagged with `feature: 'agent_reasoning'` for ledger/observability

## T-09 / PR-05 — Unified AI ledger

- Gateway accepts `aiRequestId` on requests; updates existing row instead of creating duplicates
- Async executors pass `aiRequestId` through integrations; token/cost writes removed from executors
- Single write path: pending row → gateway update

## T-10 / PR-06–07 — Gateway pipeline + circuit breakers

- Refactored gateway into `lib/ai/gateway/gateway.ts` pipeline
- Redis/memory-backed per-provider circuit breaker (`lib/ai/middleware/circuit-breaker.ts`)
- Returns 503 when circuit is open

## T-11 / PR-08–09 — Guardrails + PII

- Input guardrails block common injection patterns (`lib/ai/security/guardrails/input.ts`)
- PII redaction for email, phone, SSN before provider calls (`lib/ai/security/pii/redactor.ts`)
- Configurable via `AI_GUARDRAILS_ENABLED`, `AI_PII_REDACTION_ENABLED`

---

## Environment variables (new/updated)

```
AI_EXECUTION_MODE=direct          # default; set n8n for legacy async path
AI_MOCK_PROVIDER=true             # enable MockProvider (auto in Vitest)
AI_GUARDRAILS_ENABLED=true        # production default
AI_PII_REDACTION_ENABLED=true     # production default
AI_CIRCUIT_BREAKER_ENABLED=true   # production default
AI_CIRCUIT_BREAKER_THRESHOLD=5    # failures before open
```

---

## Testing

| Suite | Count |
|-------|------:|
| Total | 204 |
| New AI unit tests | 9 |
| New AI integration checks | 4 |

Run: `npm test`

---

## Upgrade steps

1. Apply migration `029_ai_requests_extend.sql`
2. Verify `npm test && npm run build`
3. Confirm `AI_EXECUTION_MODE` is unset or `direct` in production

---

## Next (Phase C — not in this release)

- T-12: Talent OS AI client (`createAiClient()`)
- T-13: Prompt platform DB migration
- T-14: Budget enforcement
