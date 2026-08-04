# Workflow Engine

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Implemented  
**Migration:** `028_workflow_engine_module.sql`

---

## Overview

The Workflow Engine orchestrates reusable business processes across Talent OS. It extends the existing event-driven engine (`lib/workflows/engine.ts`, migration `014_workflow_engine.sql`) with:

- **Reusable workflow definitions** — nine built-in business workflows plus legacy integration workflows
- **Execution history** — step-level audit trail for every job
- **Retries** — exponential backoff on failed jobs and domain events
- **Compensation** — saga rollback actions when steps reach dead letter
- **Observability** — run metrics, queue depth, compensation backlog
- **Events** — domain event outbox triggers workflows; module emits audit events
- **REST API** — manager endpoints under `/api/workflows/*`

**Backward compatibility:** Existing `WorkflowEngine`, `WorkflowEngineService`, `WorkflowService`, cron dispatch (`/api/cron/dispatch-events`), and job processor (`/api/cron/process-workflow-jobs`) remain unchanged and are extended—not replaced.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  REST API  /api/workflows/*                                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  WorkflowEngineModuleService                                │
│  + WorkflowEngineService → WorkflowEngine                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
     workflow_* repositories + domain_events outbox
                            │
     workflow_runs / workflow_jobs / approval_requests (014)
     workflow_definitions / execution_history / compensations (028)
```

| Layer | Location |
|-------|----------|
| Types & validation | `modules/workflow-engine/` |
| Business catalog | `modules/workflow-engine/business-workflows.ts` |
| Engine core | `lib/workflows/engine.ts`, `registry.ts`, `actions.ts` |
| Repositories | `lib/repositories/workflow*.repository.ts` |
| Module service | `lib/services/workflow-engine-module.service.ts` |
| Legacy service | `lib/services/workflow-engine.service.ts` |
| REST routes | `app/api/workflows/` |

---

## Reusable Business Workflows

| Workflow | ID | Trigger event | Purpose |
|----------|-----|---------------|---------|
| **Lead Qualification** | `wf-lead-qualification` | `crm.lead.status_changed` (status=qualified) | Score and route qualified leads |
| **Client Onboarding** | `wf-client-onboarding` | `crm.lead.converted` | Welcome client, onboarding checklist |
| **Project Creation** | `wf-project-creation` | `project.created` | Initialize workspace, request matching |
| **Talent Matching** | `wf-talent-matching` | `ai.match_requested` | AI match + notify managers |
| **Assignment** | `wf-assignment` | `assignment.created` | Confirm allocation, notify talent |
| **QA** | `wf-qa` | `project.deliverable.submitted` | Manager QA approval gate |
| **Delivery** | `wf-delivery` | `milestone.approved` | Finalize delivery, notify stakeholders |
| **Invoice** | `wf-invoice` | `payment.approved` | Generate invoice, payment notification |
| **Project Closure** | `wf-project-closure` | `project.status_changed` (status=completed) | Close project, archive, notify |

Each workflow defines:

- **Steps** — actions (`dispatch_n8n`, `notify`, `log_activity`, `emit_event`, `execute_ai`) and approval gates
- **Compensation** — rollback steps enqueued when a job reaches `dead_letter`
- **Conditions** — optional payload filters (e.g. lead status, project status)

Definitions live in code (`modules/workflow-engine/business-workflows.ts`) and are merged into `WORKFLOW_REGISTRY`. Tenants can store custom overrides in `workflow_definitions`.

---

## Execution Model

1. **Trigger** — Domain event inserted into `domain_events` outbox
2. **Match** — Cron `/api/cron/dispatch-events` calls `WorkflowEngine.triggerFromDomainEvent`
3. **Run** — `workflow_runs` row created; first steps enqueued as `workflow_jobs`
4. **Process** — Cron `/api/cron/process-workflow-jobs` executes jobs with retries
5. **History** — Each step records `started` / `completed` / `failed` in `workflow_execution_history`
6. **Compensate** — On `dead_letter`, compensation jobs created and processed in same cron
7. **Complete** — Run marked `completed` when all jobs finish; failures set run to `failed`

### Retries

| Target | Mechanism | API |
|--------|-----------|-----|
| Failed jobs | Exponential backoff (`2^n × 30s`), max 5 retries | `POST /api/workflows/retries/jobs` |
| Failed events | Reset outbox status to `pending` | `POST /api/workflows/retries/events` |
| Failed compensations | Reset compensation queue | `POST /api/workflows/compensations/retry` |

### Compensation (Saga rollback)

When a workflow job exhausts retries:

1. Job status → `dead_letter`
2. Run status → `failed`
3. Compensation steps from workflow definition inserted into `workflow_compensations`
4. Cron processes compensations with separate retry budget (max 3)
5. Successful compensation recorded in execution history as `compensated`

---

## Observability

`GET /api/workflows/observability` returns:

- Total / running / failed runs
- Pending and dead-letter jobs
- Pending compensations
- Average run duration (ms)
- Built-in business workflow catalog

Uses RPC `get_workflow_module_summary`. Integrates with platform observability via `instrumentWorkflowRun` and existing `get_observability_workflow_health`.

---

## Events

| Event type | Trigger |
|------------|---------|
| `workflow.run.started` | Manual workflow trigger |
| `workflow.retry.requested` | Admin retry of jobs/events/compensations |
| `workflow.definition.created` | Custom definition stored |
| `workflow.compensation.triggered` | (via compensation queue processing) |

Workflow module audit actions are also emitted to `domain_events` for downstream integrations.

---

## REST API summary

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/workflows/definitions` | `workflow:read` | List registry or stored definitions |
| POST | `/api/workflows/definitions` | `workflow:manage` | Create tenant custom definition |
| GET | `/api/workflows/definitions/{id}` | `workflow:read` | Get definition detail |
| GET | `/api/workflows/runs` | `workflow:read` | List workflow runs |
| GET | `/api/workflows/runs/{id}` | `workflow:read` | Get run detail |
| GET | `/api/workflows/jobs` | `workflow:read` | List workflow jobs |
| GET | `/api/workflows/history` | `workflow:read` | Execution history |
| GET | `/api/workflows/compensations` | `workflow:read` | Compensation queue |
| POST | `/api/workflows/compensations/retry` | `workflow:manage` | Retry failed compensations |
| POST | `/api/workflows/retries/jobs` | `workflow:manage` | Retry dead-letter jobs |
| POST | `/api/workflows/retries/events` | `workflow:manage` | Retry failed domain events |
| POST | `/api/workflows/trigger` | `workflow:manage` | Manual workflow trigger |
| GET | `/api/workflows/observability` | `workflow:read` | Metrics + catalog |
| GET | `/api/workflows/audit-logs` | `workflow:audit:read` | Audit trail |
| GET | `/api/workflows/approvals` | `workflow:read` | Pending approval gates |
| PATCH | `/api/workflows/approvals/{id}` | `workflow:manage` | Resolve approval |

---

## Permissions

| Permission | Roles | Description |
|------------|-------|-------------|
| `workflow:read` | admin, talent_manager | View runs, jobs, history, observability |
| `workflow:manage` | admin, talent_manager | Trigger, retry, resolve approvals, custom defs |
| `workflow:audit:read` | admin, talent_manager | View audit logs |

---

## Database schema (028)

| Table | Purpose |
|-------|---------|
| `workflow_definitions` | Reusable defs (global built-in + tenant custom) |
| `workflow_execution_history` | Step-level execution audit |
| `workflow_compensations` | Saga rollback action queue |
| `workflow_audit_logs` | Module administrative audit |

Existing tables from `014_workflow_engine.sql`:

| Table | Purpose |
|-------|---------|
| `workflow_runs` | Process instances |
| `workflow_jobs` | Background action queue |
| `approval_requests` | Human-in-the-loop gates |

---

## Testing

| Suite | Location |
|-------|----------|
| Unit | `tests/unit/workflow-engine-module.service.test.ts` |
| Integration | `tests/integration/workflow-engine-module.test.ts` |

Run: `npm test`

---

## Manual trigger example

```json
POST /api/workflows/trigger
{
  "workflow_id": "wf-project-creation",
  "aggregate_type": "project",
  "aggregate_id": "550e8400-e29b-41d4-a716-446655440000",
  "payload": { "title": "Website redesign" }
}
```

Creates a domain event, triggers matching workflows, returns `{ eventId, runs }`.

---

## Related docs

- `docs/31-workflow-engine.md` — original engine design
- `docs/09-n8n-workflows.md` — n8n integration
- `docs/Architecture/ASSIGNMENT_MODULE.md` — assignment events
- `docs/Architecture/PROJECT_MODULE.md` — project events
