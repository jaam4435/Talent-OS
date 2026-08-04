# Workflow Orchestration — Implementation Specification

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Draft — awaiting approval  
**Bounded context:** Workflow Orchestration  
**References:** `DOMAIN_MODEL.md`, `CONTEXT_MAP.md`, `EVENT_CATALOG.md`, `UBIQUITOUS_LANGUAGE.md`

---

## 1. Business Overview

The Workflow Orchestration context provides **event-driven process orchestration** across all bounded contexts: match domain events to workflow definitions, enqueue jobs, human approvals, retries, compensation (saga rollback), and outbound actions (n8n, AI, notifications).

**Primary actors:** Platform (cron), talent manager (manual trigger, approval resolution)  
**Business outcome:** Reliable cross-context business processes with observability and failure recovery.

---

## 2. Responsibilities

### In scope

- Domain event outbox write (`domain_events`)
- Workflow definition registry (9 built-in + tenant custom)
- Run and job lifecycle management
- Step execution (n8n, notify, log, emit_event, execute_ai, approval gates)
- Exponential backoff retries and dead-letter handling
- Saga compensation on failure
- Human approval requests and resolution
- Execution history and audit logging
- REST management and observability APIs
- Legacy milestone bridge (WorkflowService)

### Out of scope

- Business entity mutations (owning contexts)
- Workflow content in n8n (external system)
- AI provider routing (AI Gateway BC)
- WhatsApp message parsing (WhatsApp BC) — approval resolution only

---

## 3. Public APIs

Base path: `/api/workflows`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET/POST | `/api/workflows/definitions` | `workflow:read` / `workflow:manage` | List/create definitions |
| GET | `/api/workflows/definitions/{id}` | `workflow:read` | Definition detail |
| GET | `/api/workflows/runs` | `workflow:read` | List runs |
| GET | `/api/workflows/runs/{id}` | `workflow:read` | Run detail |
| GET | `/api/workflows/jobs` | `workflow:read` | List jobs |
| GET | `/api/workflows/history` | `workflow:read` | Execution history |
| GET | `/api/workflows/compensations` | `workflow:read` | Compensation queue |
| POST | `/api/workflows/compensations/retry` | `workflow:manage` | Retry compensations |
| POST | `/api/workflows/retries/jobs` | `workflow:manage` | Retry dead-letter jobs |
| POST | `/api/workflows/retries/events` | `workflow:manage` | Retry failed events |
| POST | `/api/workflows/trigger` | `workflow:manage` | Manual workflow trigger |
| GET/POST | `/api/workflows/approvals` | read/manage | Approval requests |
| GET/PATCH | `/api/workflows/approvals/{id}` | read/manage | Resolve approval |
| GET | `/api/workflows/observability` | `workflow:read` | Metrics summary |
| GET | `/api/workflows/audit-logs` | `workflow:audit:read` | Audit trail |

**Cron (internal):**

- `GET /api/cron/dispatch-events` — outbox → trigger workflows
- `GET /api/cron/process-workflow-jobs` — execute pending jobs

---

## 4. Internal Services

| Service | Path | Role |
|---------|------|------|
| **WorkflowEngineModuleService** | `lib/services/workflow-engine-module.service.ts` | REST management, manual trigger, observability |
| **WorkflowEngineService** | `lib/services/workflow-engine.service.ts` | Core engine: trigger, execute, retry, compensate |
| **WorkflowEngine** | `lib/workflows/engine.ts` | Job processor, action dispatch |
| **WorkflowService** | `lib/services/workflow.service.ts` | Outbox write, milestone lifecycle bridge |

**Module layer:** `modules/workflow-engine/` — types, validation, `WORKFLOW_EVENT_TYPES`, `business-workflows.ts`

**Repositories:** `WorkflowRepository`, `WorkflowDefinitionRepository`, `WorkflowExecutionHistoryRepository`, `WorkflowCompensationRepository`, `WorkflowAuditRepository`, `DomainEventRepository`

---

## 5. Database Schema

**Migrations:** `014_workflow_engine.sql`, `028_workflow_engine_module.sql`

| Table | Purpose |
|-------|---------|
| `domain_events` | Outbox aggregate (integration boundary) |
| `workflow_runs` | Single execution instance |
| `workflow_jobs` | Individual step jobs |
| `approval_requests` | Human approval gates |
| `workflow_definitions` | Tenant custom definitions |
| `workflow_execution_history` | Step-level audit |
| `workflow_compensations` | Saga rollback queue |
| `workflow_audit_logs` | Module audit |

**Key RPCs:** `get_workflow_module_summary`, `get_observability_workflow_health`

---

## 6. Aggregates

| Aggregate | Root table | Invariants |
|-----------|------------|------------|
| **DomainEvent** | `domain_events` | Idempotency via `idempotency_key`; status: pending → processed/failed |
| **WorkflowRun** | `workflow_runs` | One run per trigger; status: running → completed/failed |
| **WorkflowJob** | `workflow_jobs` | Belongs to run; max 5 retries → dead_letter |
| **ApprovalRequest** | `approval_requests` | Blocks run until resolved |
| **WorkflowDefinition** | `workflow_definitions` | Merged with code registry |

**Built-in business workflows:**

| ID | Trigger | Purpose |
|----|---------|---------|
| `wf-lead-qualification` | `crm.lead.status_changed` (qualified) | Score and route leads |
| `wf-client-onboarding` | `crm.lead.converted` | Client onboarding |
| `wf-project-creation` | `project.created` | Initialize workspace |
| `wf-talent-matching` | `ai.match_requested` | AI match + notify |
| `wf-assignment` | `assignment.created` | Confirm allocation |
| `wf-qa` | `project.deliverable.submitted` | QA approval gate |
| `wf-delivery` | `milestone.approved` | Finalize delivery |
| `wf-invoice` | `payment.approved` | Invoice workflow |
| `wf-project-closure` | `project.status_changed` (completed) | Close project |

---

## 7. Domain Events

### Engine meta-events (`WORKFLOW_EVENT_TYPES`)

`workflow.run.started/completed/failed`, `workflow.step.started/completed/failed`, `workflow.compensation.triggered/completed`, `workflow.retry.requested`, `workflow.definition.created/updated`

### Consumed

All namespaced events (`crm.*`, `talent.*`, `project.*`, `assignment.*`, `organization.*`, `whatsapp.*`) plus legacy flat events (`milestone.*`, `opportunity.*`, `payment.*`)

### Emitted by actions

Configured `emit_event` steps (e.g. `project.closed`)

---

## 8. Commands

| Command | Handler | Preconditions |
|---------|---------|---------------|
| EmitDomainEvent | `WorkflowService.emitEvent()` | Valid event type; idempotency key |
| TriggerWorkflow | `WorkflowEngineService.triggerFromDomainEvent()` | Matching definition exists |
| ProcessJob | Cron processor | Job status pending; run not blocked |
| RetryJob | `WorkflowEngineModuleService.retryJobs()` | Job in dead_letter |
| ResolveApproval | `WorkflowEngineModuleService.resolveApproval()` | Approval pending |
| ManualTrigger | `WorkflowEngineModuleService.triggerManual()` | `workflow:manage` |
| RetryFailedEvents | Reset outbox status to pending | Admin action |
| RetryCompensations | Reset compensation queue | Admin action |

---

## 9. Queries

| Query | Returns |
|-------|---------|
| ListDefinitions | Registry + stored custom definitions |
| ListRuns | Paginated runs with status filters |
| GetRun | Run with jobs and history |
| ListJobs | Jobs by run, status, queue |
| GetHistory | Step-level execution audit |
| ListCompensations | Pending/failed compensations |
| GetObservability | Runs, jobs, compensations, avg duration |
| ListApprovals | Pending approval requests |
| ListAuditLogs | Workflow audit entries |

---

## 10. Validation Rules

**Source:** `modules/workflow-engine/validation.ts`

| Rule | Field | Constraint |
|------|-------|------------|
| Manual trigger | `workflowId` | Must exist in registry or stored definitions |
| Approval resolution | `action` | approve or reject |
| Event payload | `payload` | Valid JSON; size limits |
| Idempotency key | `idempotencyKey` | Max 256 chars; unique per tenant |

**Business rules:**

- Exponential backoff: `2^n × 30s`, max 5 retries → dead letter
- Dead letter triggers compensation steps from definition
- Approval gates block run until resolved
- Event dispatch uses idempotency to prevent duplicate runs

---

## 11. Authorization Rules

| Permission | Roles | Operations |
|------------|-------|------------|
| `workflow:read` | admin, talent_manager | View runs, jobs, history, observability |
| `workflow:manage` | admin, talent_manager | Manual trigger, retries, approval resolution |
| `workflow:audit:read` | admin, talent_manager | Audit logs |

**Cron endpoints:** Protected by `CRON_SECRET` header; no user session.

---

## 12. AI Capabilities

| Feature | Trigger | Output |
|---------|---------|--------|
| **execute_ai action** | Workflow step | Delegates to AI Gateway |
| **MCP workflow tools** | Agent invocation | Trigger, inspect runs via MCP |

**Indirect:** `wf-talent-matching` chains on `ai.match_requested`.

---

## 13. Background Jobs

| Job | Schedule | Action |
|-----|----------|--------|
| Dispatch events | Cron `/api/cron/dispatch-events` | Match outbox → trigger workflows |
| Process jobs | Cron `/api/cron/process-workflow-jobs` | Execute pending jobs with retries |
| Process compensations | Same cron | Saga rollback steps |
| Retry dead letters | Manual API | Admin-initiated retry |

---

## 14. Integrations

| System | Direction | Purpose |
|--------|-----------|---------|
| **n8n** | Outbound | `dispatch_n8n` action; HMAC-signed webhooks |
| **AI Gateway** | Outbound | `execute_ai` action |
| **NotificationService** | Outbound | `notify` action |
| **WhatsApp BC** | Bidirectional | Approval gates via `whatsapp_approval_gates` |
| **All business contexts** | Inbound | Domain events from mutations |
| **Redis** | Optional | Distributed job locking (future) |

---

## 15. Observability

| Signal | Source |
|--------|--------|
| Execution history | `workflow_execution_history` |
| Observability RPC | `get_workflow_module_summary` |
| Instrumentation | `instrumentWorkflowRun()` |
| Analytics | Workflow Performance dashboard |
| Audit logs | `workflow_audit_logs` |

**Alerts (future):** Dead-letter queue depth; compensation backlog threshold.

---

## 16. Testing Strategy

| Test | Focus |
|------|-------|
| Unit | Step action dispatch (mock integrations) |
| Unit | Retry backoff calculation |
| Integration | API permission matrix (`tests/integration/workflow-engine-module.test.ts`) |
| Integration | Event → trigger → job execution |
| Integration | Compensation on dead letter |
| E2E | Lead qualified → wf-lead-qualification run |

**Coverage target:** 80% on engine core and module service.

---

## 17. Migration Strategy

| Migration | Content |
|-----------|---------|
| `014_workflow_engine.sql` | Runs, jobs, approvals, outbox |
| `028_workflow_engine_module.sql` | Definitions, history, compensations, audit |
| Future | Tenant workflow editor UI |

**Data migration:** Built-in workflows registered in code; no DB seed required.

---

## 18. Future Enhancements

1. **Visual workflow editor** — Tenant custom step builder
2. **Parallel step execution** — Fan-out/fan-in patterns
3. **Scheduled triggers** — Cron-based workflow starts
4. **Event replay** — Reprocess historical events
5. **Unified event naming** — Migrate legacy flat events to namespaced
6. **Distributed locking** — Redis-based job processor scaling

---

## Appendix — File map

| Artifact | Path |
|----------|------|
| Types | `modules/workflow-engine/types.ts` |
| Business catalog | `modules/workflow-engine/business-workflows.ts` |
| Engine | `lib/workflows/engine.ts`, `registry.ts`, `actions.ts` |
| Module service | `lib/services/workflow-engine-module.service.ts` |
| Routes | `app/api/workflows/**`, `app/api/cron/**` |
| Architecture doc | `docs/Architecture/WORKFLOW_ENGINE.md` |
