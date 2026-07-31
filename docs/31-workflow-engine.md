# Workflow Engine Architecture

Every major business process is modeled as a **workflow**: a domain event trigger, optional conditions, and a sequence of actions (including human approval gates).

## Concepts

| Concept | Implementation |
|---|---|
| **Triggers** | Existing `domain_events` outbox — DB triggers + service `emitEvent()` |
| **Conditions** | JSON field/operator rules evaluated before starting a run |
| **Actions** | `dispatch_n8n`, `execute_ai`, `notify`, `emit_event`, `log_activity` |
| **Queues** | `workflow_jobs.queue_name`: `default`, `integrations`, `ai`, `notifications`, `approvals` |
| **Retries** | Exponential backoff on jobs (max 5) and domain events (existing) |
| **Human Approval** | `approval_requests` table pauses runs until approve/reject |
| **Background Jobs** | Cron routes poll and execute job queue |

## Flow

```
Business action → emit domain_event (outbox)
       ↓
GET /api/cron/dispatch-events
       ↓
WorkflowEngine.triggerFromDomainEvent()
  → match WORKFLOW_REGISTRY by event_type
  → evaluate conditions
  → create workflow_run + enqueue workflow_jobs
       ↓
GET /api/cron/process-workflow-jobs
       ↓
WorkflowEngine.processJobQueue()
  → execute actions (n8n, AI, notify, …)
  → approval steps create approval_requests and pause run
       ↓
Manager resolves via resolveApproval() action
  → resume run with onApproved / onRejected steps
```

## Built-in workflows

Defined in `lib/workflows/registry.ts` and mapped to existing domain events:

| Event | Workflow |
|---|---|
| `opportunity.broadcast` | n8n dispatch |
| `opportunity.opened` | n8n dispatch |
| `opportunity.response` | notify + n8n |
| `project.assigned` | n8n + activity log |
| `milestone.submitted` | manager approval gate |
| `milestone.approved` | n8n + notify freelancer |
| `milestone.revision_requested` | notify freelancer |
| `milestone.overdue` | notify + n8n |
| `ai.*_requested` | execute AI (direct) or n8n fallback |
| `payment.approved` / `payment.paid` | n8n + notifications |

## Code layout

```
lib/workflows/
  types.ts       — Trigger, condition, action, step types
  registry.ts    — Built-in workflow definitions
  conditions.ts  — Condition evaluator
  actions.ts     — Action executors
  engine.ts      — WorkflowEngine (trigger + job processor + approvals)

lib/repositories/workflow.repository.ts
lib/services/workflow-engine.service.ts

app/api/cron/dispatch-events/route.ts      — Trigger workflows from outbox
app/api/cron/process-workflow-jobs/route.ts — Execute background jobs
app/actions/approvals.ts                  — Human approval resolution
```

## Adding a workflow

1. Emit a domain event from the service layer (or add a DB trigger)
2. Add a `WorkflowDefinition` to `lib/workflows/registry.ts`
3. Define steps: actions and/or approval gates
4. Background jobs run automatically via cron

## Cron schedule (vercel.json)

| Route | Schedule |
|---|---|
| `/api/cron/dispatch-events` | Every minute |
| `/api/cron/process-workflow-jobs` | Every minute |
| `/api/cron/check-overdue-milestones` | Daily 08:00 UTC |

All cron routes require `Authorization: Bearer $CRON_SECRET`.

## Human approval

When a workflow step has `type: 'approval'`:

1. An `approval_request` is created for the resolved approver
2. The run status becomes `waiting_approval`
3. Manager calls `resolveApproval({ approvalId, decision, note })`
4. Follow-up steps from `onApproved` / `onRejected` are enqueued

## Migration

`supabase/migrations/014_workflow_engine.sql` adds:

- `workflow_runs`
- `workflow_jobs`
- `approval_requests`
