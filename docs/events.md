# Events

Talent OS uses a **transactional outbox** pattern. Side effects (n8n, notifications, AI, workflows) are triggered by domain events, not direct calls from business logic.

---

## Event Flow

```
Service action
  → INSERT domain_events (status: pending)
  → Cron: GET /api/cron/dispatch-events
  → WorkflowEngine.triggerFromDomainEvent()
  → workflow_runs + workflow_jobs
  → Cron: GET /api/cron/process-workflow-jobs
  → Action executors (n8n, AI, notify, …)
```

---

## Domain Event Catalog

| Event | Emitter | Workflow |
|---|---|---|
| `opportunity.broadcast` | AssignmentService | wf-opportunity-broadcast |
| `opportunity.opened` | CRMService | wf-opportunity-opened |
| `opportunity.response` | CRMService | wf-opportunity-response |
| `project.assigned` | ProjectService | wf-project-assigned |
| `milestone.submitted` | ProjectService | wf-milestone-submitted (approval) |
| `milestone.approved` | WorkflowService | wf-milestone-approved |
| `milestone.revision_requested` | WorkflowService | wf-milestone-revision |
| `milestone.overdue` | Cron | wf-milestone-overdue |
| `ai.match_requested` | AIService | wf-ai-match |
| `ai.brief_parse_requested` | AIService | wf-ai-brief-parse |
| `ai.summary_requested` | AIService | wf-ai-summary |
| `ai.status_assessment_requested` | AIService | wf-ai-status |
| `payment.approved` | FinanceService | wf-payment-approved |
| `payment.paid` | FinanceService | wf-payment-paid |
| `whatsapp.inbound` | WhatsAppService | wf-whatsapp-inbound |
| `whatsapp.agent_requested` | WhatsAppService | wf-whatsapp-agent |
| `whatsapp.opt_out` | WhatsAppService | wf-whatsapp-opt-out |

Auto-generated workflow map: [generated/workflows.md](./generated/workflows.md)

---

## Outbox Table (`domain_events`)

| Column | Purpose |
|---|---|
| `event_type` | Dot-notation event name |
| `aggregate_type` / `aggregate_id` | Entity reference |
| `idempotency_key` | Dedup (unique per tenant) |
| `correlation_id` | Trace across systems |
| `payload` | JSONB event data |
| `status` | pending → processing → completed / failed |
| `retry_count` / `max_retries` | Exponential backoff |

Emit via: `WorkflowService.emitEvent()` or `emit_domain_event()` RPC

---

## Webhook Events (Inbound)

| Source | Route | Verification |
|---|---|---|
| n8n | `/api/webhooks/n8n` | HMAC signature |
| WhatsApp | `/api/webhooks/whatsapp` | Meta verify token + signature |

Deliveries logged in `webhook_deliveries` with idempotency keys.

---

## Future Marketplace Events

Defined in architecture (not yet implemented):

- `marketplace.profile_published`
- `marketplace.invitation_sent`
- `marketplace.contract_signed`
- `marketplace.recommendation_generated`

See [35-marketplace-architecture.md](./35-marketplace-architecture.md)

---

## Related

- [Workflow](./workflow.md)
- [09 n8n Workflows](./09-n8n-workflows.md)
- [31 Workflow Engine](./31-workflow-engine.md)
- [12 WhatsApp + n8n Integration](./12-whatsapp-n8n-integration-architecture.md)
