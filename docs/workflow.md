# Workflow

Every major business process is modeled as a **workflow**: domain event trigger → optional conditions → sequence of actions (including human approval gates).

> **Auto-generated registry:** [generated/workflows.md](./generated/workflows.md)

---

## Concepts

| Concept | Table / Code |
|---|---|
| **Triggers** | `domain_events` → `lib/workflows/registry.ts` |
| **Conditions** | JSON rules — `lib/workflows/conditions.ts` |
| **Actions** | dispatch_n8n, execute_ai, notify, emit_event, log_activity |
| **Queues** | default, integrations, ai, notifications, approvals |
| **Jobs** | `workflow_jobs` — retry with exponential backoff |
| **Approvals** | `approval_requests` — pauses run until resolved |
| **Runs** | `workflow_runs` — tracks step progress |

---

## Engine Flow

```
domain_event (outbox)
  → GET /api/cron/dispatch-events
  → WorkflowEngine.triggerFromDomainEvent()
    → match WORKFLOW_REGISTRY by event_type
    → evaluate conditions
    → create workflow_run + enqueue workflow_jobs
  → GET /api/cron/process-workflow-jobs
  → WorkflowEngine.processJobQueue()
    → execute actions
    → approval steps pause run
  → Manager resolves via app/actions/approvals.ts
    → resume with onApproved / onRejected steps
```

Code: `lib/workflows/engine.ts`, `lib/services/workflow-engine.service.ts`

---

## Built-in Workflows

| Event | Workflow | Notable steps |
|---|---|---|
| `opportunity.broadcast` | Broadcast | dispatch_n8n |
| `milestone.submitted` | Review gate | **approval** (manager) |
| `milestone.approved` | Completion | dispatch_n8n + notify |
| `ai.match_requested` | AI Match | execute_ai |
| `payment.paid` | Payment | dispatch_n8n + notify |
| `whatsapp.inbound` | WhatsApp | log_activity |

Full registry: [generated/workflows.md](./generated/workflows.md)

---

## Adding a Workflow

1. Emit a domain event from the service layer
2. Add a `WorkflowDefinition` to `lib/workflows/registry.ts`
3. Define steps: actions and/or approval gates
4. Cron routes process jobs automatically

After adding, run `npm run docs:generate` to update the catalog.

---

## Approval Actions

Managers resolve via `app/actions/approvals.ts`:

- Approve → resumes run with `onApproved` steps
- Reject → resumes with `onRejected` steps

---

## Related

- [31 Workflow Engine (legacy)](./31-workflow-engine.md)
- [Events](./events.md)
- [09 n8n Workflows](./09-n8n-workflows.md)
- [Operations Guide](./operations-guide.md) — cron schedules
