# Phase 2 Migration Notes

| Field | Value |
|-------|-------|
| **Version** | Phase 2 — Platform Foundation |
| **Date** | 2026-07-30 |
| **Migration** | `supabase/migrations/020_phase2_foundation.sql` |
| **Depends on** | Phase 1 (`019_phase1_security_fixes.sql`) |

---

## Overview

Phase 2 standardizes all business modules under `modules/<domain>/` and completes platform foundation work: Finance write path, talent consolidation, event claim, integration encryption, and data layer hardening.

**No breaking API changes** for external consumers. Legacy import paths remain as re-exports.

---

## 1. Database Migration

```bash
supabase db push
# or
psql "$DATABASE_URL" -f supabase/migrations/020_phase2_foundation.sql
```

### Changes

| Change | Gap ID |
|--------|--------|
| Index `domain_events(status, scheduled_at)` | WF-01 |
| Column `integration_configs.whatsapp_phone_number_id` + index | INT-03, WA-04 |
| Index `webhook_deliveries(created_at)` for purge | INT-04 |
| Function `is_member_of(tenant_id)` | CORE-05 |
| `search_freelancers` requires membership | TAL-03 |
| `search_knowledge_entries` requires membership | KB-04 |

### Backfill

WhatsApp configs: `whatsapp_phone_number_id` is populated from `config->>'phone_number_id'` for existing rows.

---

## 2. Module Standardization

All domains now follow [MODULE_STANDARD.md](./MODULE_STANDARD.md):

```
modules/<domain>/
├── api/           # Server actions
├── services/      # Business logic
├── repositories/  # Persistence
├── types/
├── schemas/
├── events/
├── tests/
└── README.md
```

### Import migration (recommended)

| Old | New |
|-----|-----|
| `@/lib/talent/queries` | `@/lib/queries/talent.queries` |
| `@/lib/domains/talent/factory` | `createServices()` from `@/lib/services/factory` |
| `@/lib/services/finance.service` | `@/modules/finance` (optional) |

Deprecated paths continue to work.

---

## 3. Talent Consolidation

- `PortfolioService` registered in `createServices()` as `services.portfolio`
- Canonical queries: `lib/queries/talent.queries.ts` (includes portfolio + rating)
- `lib/talent/queries.ts` → deprecation re-export only

---

## 4. Finance

New server actions: `app/actions/payments.ts`

| Action | Role | Emits |
|--------|------|-------|
| `approvePayment` | Manager | `payment.approved` |
| `markPaymentPaid` | Manager | `payment.paid` |

Payments page shows Approve / Mark paid for managers.

---

## 5. Event Dispatch

Cron `dispatch-events` now uses `claimForDispatch()` — atomic pending/failed → processing.

Parallel cron invocations will not double-dispatch the same event.

---

## 6. Integration Config Encryption

When `ENCRYPTION_KEY` is set, new configs written via `IntegrationConfigRepository.upsertConfig()` are encrypted at rest (`enc:v1:` prefix).

Reads auto-detect encrypted vs plaintext (dual-read during transition).

---

## 7. New Cron Route

`GET /api/cron/purge-webhook-deliveries` — purges `webhook_deliveries` older than 72 hours.

Add to Vercel cron schedule alongside existing jobs.

---

## 8. Environment

| Variable | Required | Notes |
|----------|----------|-------|
| `ENCRYPTION_KEY` | Recommended | 64-char hex; enables config encryption |

---

## 9. Verification

- [ ] Manager can approve and mark paid on `/payments`
- [ ] Portfolio pages load via `createServices().portfolio`
- [ ] No app imports of `@/lib/talent/queries` (except deprecation shim)
- [ ] Cron dispatch uses claim (no duplicate processing under parallel run)
- [ ] WhatsApp tenant resolution uses indexed column
- [ ] `npm test` passes with expanded service test suite

---

## Related

- [PHASE2_RELEASE_NOTES](./PHASE2_RELEASE_NOTES.md)
- [Engineering Roadmap](./Engineering%20Roadmap.md) — Phase 2 acceptance criteria
