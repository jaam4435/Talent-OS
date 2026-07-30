# Phase 2 Release Notes — Platform Foundation

| Field | Value |
|-------|-------|
| **Version** | Phase 2 |
| **Date** | 2026-07-30 |
| **Type** | Architecture + foundation |
| **Breaking changes** | None (backwards-compatible re-exports) |

---

## Summary

Phase 2 standardizes every business module under a consistent layout (API, Service, Repository, Types, Schemas, Events, Tests, Documentation) and completes platform foundation deliverables from the Engineering Roadmap.

---

## Module Standardization

All 15 domains now expose the standard module structure under `modules/<domain>/`:

- **Core**, **Talent**, **CRM**, **Projects**, **Assignment**, **Finance**, **Workflow**, **AI**, **Knowledge**, **Agents**, **WhatsApp**, **Integrations**, **Notifications**, **Analytics**, **Marketplace**

See [MODULE_STANDARD.md](./MODULE_STANDARD.md) for the canonical specification.

### Architecture enforcement

- Pages and components do **not** access Supabase directly
- Repositories own persistence
- Services own business logic
- Events own cross-domain communication

---

## Talent Consolidation (TAL-01, TAL-02)

- `PortfolioService` registered in main service factory
- Single query path: `lib/queries/talent.queries.ts`
- Deprecated: `lib/talent/queries.ts`, ad-hoc `createTalentServices()` DI

---

## Finance Completion (FIN-01, FIN-02, FIN-03)

- `FinanceService.approvePayment()` and `markPaymentPaid()`
- Server actions in `app/actions/payments.ts`
- UI actions on payments page for managers
- Events: `payment.approved`, `payment.paid`

---

## Data Layer Hardening

| Deliverable | Description |
|-------------|-------------|
| Event claim | `DomainEventRepository.claimForDispatch()` |
| Outbox index | Composite index on `(status, scheduled_at)` |
| Integration encryption | AES-256-GCM for `integration_configs` |
| WhatsApp lookup | Indexed `whatsapp_phone_number_id` column |
| Webhook purge | Cron route for 72h retention |
| RPC guards | `is_member_of()` on search RPCs |
| Broadcast idempotency | Stable key based on recipient set |

---

## Testing

| New test suites | Coverage area |
|-----------------|---------------|
| `finance.service.test.ts` | Approve/pay flows |
| `talent.service.test.ts` | Search delegation |
| `crm.service.test.ts` | Company reads |
| `project.service.test.ts` | Project reads |
| `domain-event.repository.test.ts` | Event claim |
| `rls-fixture.test.ts` | RLS harness foundation |

---

## Upgrade Steps

1. Apply migration `020_phase2_foundation.sql`
2. Set `ENCRYPTION_KEY` if not already configured
3. Add cron job for `purge-webhook-deliveries`
4. Update imports to canonical paths (optional — shims remain)
5. Run `npm test`

See [PHASE2_MIGRATION_NOTES](./PHASE2_MIGRATION_NOTES.md) for full details.

---

## Resolved Gap IDs

FIN-01, FIN-02, FIN-03, TAL-01, TAL-02, WF-01, WF-05, INT-02, INT-03, INT-04, WA-04, TAL-03, KB-04, ASG-01, X-03 (partial), CORE-05 (foundation)

---

**Awaiting review.**
