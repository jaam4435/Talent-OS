# Event Platform Implementation

| Field | Value |
|-------|-------|
| **Version** | 1.0.0 |
| **Date** | 2026-07-30 |
| **Status** | Implemented |
| **Spec** | [16 Event Catalog](./16%20Event%20Catalog.md) |

---

## Rule

**Every business action emits an event.** Domain and application events go to the transactional outbox (`domain_events`). Integration events are recorded in `webhook_deliveries`.

---

## Event Categories

| Category | Storage | Examples |
|----------|---------|----------|
| **Domain** | `domain_events` outbox | `milestone.submitted`, `payment.approved` |
| **Application** | `domain_events` outbox (tagged) | `ai.match_requested`, `whatsapp.inbound` |
| **Integration** | `webhook_deliveries` | `whatsapp.send_completed`, `email.sent` |

---

## Architecture

```
Business Service
      ↓
EventPlatformService.emitDomainEvent() / emitApplicationEvent()
      ↓
domain_events (pending) — idempotent via (tenant_id, idempotency_key)
      ↓
Cron: runEventDispatchWorker() — atomic claim (SKIP LOCKED)
      ↓
WorkflowEngine.triggerFromDomainEvent() → workflow_jobs
      ↓
Cron: runJobProcessorWorker() — claim jobs, execute actions
      ↓
finalize_domain_event_if_complete() → status=delivered
```

---

## Reliability

| Feature | Implementation |
|---------|----------------|
| **Idempotency** | Unique `(tenant_id, idempotency_key)` + `ON CONFLICT DO NOTHING` |
| **Retries** | Exponential backoff `2^n × 30s`, default 5 retries |
| **Dead letter** | Status `dead_letter` on `domain_events` / `workflow_jobs` |
| **Exactly-once** | Atomic claim RPC + processing fingerprints |
| **Completion** | Events marked `delivered` only after workflow jobs finish |

---

## Background Workers

| Worker | Cron | Path |
|--------|------|------|
| Event dispatch | `* * * * *` | `/api/cron/dispatch-events` |
| Job processor | `* * * * *` | `/api/cron/process-workflow-jobs` |
| Webhook purge | `0 4 * * *` | `/api/cron/purge-webhook-deliveries` |

---

## Usage

```typescript
import { emitEvent } from '@/lib/integrations/events'
import { IdempotencyKeys } from '@/lib/events'
import { FinanceEvents } from '@/modules/finance/events'

await emitEvent({
  tenantId,
  eventType: FinanceEvents.PAYMENT_APPROVED,
  aggregateType: 'payment',
  aggregateId: paymentId,
  idempotencyKey: IdempotencyKeys.paymentApproved(paymentId),
  actorId: userId,
  payload: { payment_id: paymentId },
})
```

---

## Catalog

- Code: `lib/events/catalog.ts`
- Generated: `docs/generated/events-catalog.md`
- Constants: `modules/*/events/`

```bash
npm run events:catalog
```

---

## Dead Letter Queue

```typescript
const dlq = await services.eventPlatform.listDeadLetterEvents(tenantId)
await services.eventPlatform.retryDeadLetterEvents(dlq.map((e) => e.id))
```

MCP: `workflow_retry_failed_events`
