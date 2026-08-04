# WhatsApp Platform

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Implemented  
**Migration:** `030_whatsapp_platform_module.sql`

---

## Overview

The WhatsApp Platform makes every important business operation executable through WhatsApp. It extends the existing first-class WhatsApp interface (`lib/services/whatsapp.service.ts`, migration `015_whatsapp_conversations.sql`) with:

- **Business operations** — create opportunities, approve projects, accept/reject assignments, request revisions, send deliverables
- **Conversation memory** — turn history stored per freelancer session for AI context
- **AI intent detection** — rule-based keywords plus conversation context boost; free text falls through to AI agent
- **Workflow invocation** — manual workflow triggers and human approval resolution
- **Notifications** — in-app notifications via existing `NotificationService`
- **Audit logs** — every platform operation recorded in `whatsapp_audit_logs`
- **REST API** — manager endpoints under `/api/whatsapp/*`

**Design principle:** All business logic delegates to existing services (`CRMService`, `ProjectModuleService`, `AssignmentModuleService`, `WorkflowService`, `WorkflowEngineModuleService`, `NotificationService`). No duplicated orchestration.

---

## Architecture

```
Meta Webhook → parseMetaWebhook
            → WhatsAppPlatformModuleService.processInboundMessage
                 → WhatsAppService (orchestration)
                 → detectIntent (keywords + context + AI fallback)
                 → handleWhatsAppIntent → module service → existing services
                 → whatsapp_memory_entries (conversation memory)
                 → whatsapp_audit_logs (audit trail)
                 → domain_events (workflow integration)
                 → n8n outbound (confirmations, replies)
```

| Layer | Location |
|-------|----------|
| Types & validation | `modules/whatsapp-platform/` |
| Message parser | `lib/whatsapp/parser.ts` |
| Intent detection | `lib/whatsapp/intents.ts` |
| Handlers | `lib/whatsapp/handlers.ts` |
| Legacy orchestrator | `lib/services/whatsapp.service.ts` |
| Module service | `lib/services/whatsapp-platform-module.service.ts` |
| Repositories | `lib/repositories/whatsapp-*.repository.ts` |
| Webhook | `app/api/webhooks/whatsapp/route.ts` |
| REST API | `app/api/whatsapp/` |

---

## Business Operations

| Operation | Intent | Delegates to |
|-----------|--------|--------------|
| **Create Opportunity** | `opportunity.create` | `CRMService.createOpportunity()` |
| **Respond to Opportunity** | `opportunity.interested/declined` | `CRMService.respondToPendingOpportunity()` |
| **Approve Project** | `project.approve` | `ProjectModuleService.transitionStatus()` |
| **Accept Assignment** | `assignment.accept` | `AssignmentModuleService.updateAllocation(status: confirmed)` |
| **Reject Assignment** | `assignment.reject` | `AssignmentModuleService.cancelAllocation()` |
| **Request Revision** | `milestone.revision` | `WorkflowService.reviewMilestone(action: revision)` |
| **Approve Milestone** | `milestone.approve` | `WorkflowService.reviewMilestone(action: approve)` |
| **Submit Milestone** | `milestone.submit` | `WorkflowService.submitMilestone()` |
| **Send Deliverables** | `deliverable.submit` | `ProjectModuleService.createDeliverable/updateDeliverable()` |
| **Resolve Approval** | `approval.approve/reject` | `WorkflowEngineModuleService.resolveApproval()` |
| **Trigger Workflow** | `workflow.trigger` | `WorkflowEngineModuleService.triggerManual()` |
| **Send Notification** | `notification.send` | `NotificationService.create()` |
| **AI Query** | `agent.query` | `AiGateway.complete()` via `WhatsAppService.runAgentQuery()` |

---

## Conversation Memory

Turn history is stored in `whatsapp_memory_entries`:

- **user** — inbound WhatsApp messages
- **assistant** — AI agent responses
- **system** — optional system context

Memory is appended on every inbound message and after successful agent queries. Managers can retrieve memory via `GET /api/whatsapp/conversations/{freelancerId}`.

The `whatsapp_conversations.memory_summary` column supports optional session summaries for long conversations.

---

## AI Intent Detection

Detection pipeline (`lib/whatsapp/intents.ts`):

1. **Keyword match** — normalized body matched against intent keyword table (YES/NO, SUBMIT, ACCEPT ASSIGNMENT, etc.)
2. **Context boost** — if `active_entity_type` / `active_entity_id` set on conversation, short replies (YES/NO/APPROVE) map to entity-specific intents
3. **AI fallback** — messages ≥ 8 characters with no keyword match route to `agent.query`

Button payloads from Meta interactive messages are normalized through the same pipeline.

---

## Human Approval

Workflow approval gates can be linked to WhatsApp sessions via `whatsapp_approval_gates`:

- Maps `approval_requests` to freelancer phone/session
- Freelancers/managers reply APPROVE REQUEST / REJECT REQUEST
- Resolution delegates to `WorkflowEngineModuleService.resolveApproval()`
- Gate marked resolved; audit entry written

Managers can also resolve via `POST /api/whatsapp/approvals/{id}`.

---

## Audit Logs

All platform operations write to `whatsapp_audit_logs`:

| Action prefix | Example |
|---------------|---------|
| `whatsapp.intent.*` | Inbound intent handled |
| `whatsapp.opportunity.created` | Opportunity created via command |
| `whatsapp.project.approved` | Project status transition |
| `whatsapp.assignment.*` | Assignment accept/reject |
| `whatsapp.milestone.*` | Milestone approve/revision |
| `whatsapp.deliverable.submitted` | Deliverable submitted |
| `whatsapp.approval.resolved` | Workflow approval resolved |
| `whatsapp.workflow.triggered` | Manual workflow trigger |
| `whatsapp.notification.sent` | Notification dispatched |

Query via `GET /api/whatsapp/audit-logs`.

---

## REST API

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/whatsapp/conversations` | `whatsapp:read` | List active conversations |
| GET | `/api/whatsapp/conversations/{freelancerId}` | `whatsapp:read` | Conversation + memory |
| GET | `/api/whatsapp/audit-logs` | `whatsapp:audit:read` | Paginated audit trail |
| GET | `/api/whatsapp/observability` | `whatsapp:read` | Module metrics summary |
| GET | `/api/whatsapp/approvals` | `whatsapp:read` | Pending workflow + WhatsApp gates |
| POST | `/api/whatsapp/approvals/{id}` | `whatsapp:manage` | Resolve approval gate |
| POST | `/api/whatsapp/commands` | `whatsapp:manage` | Execute business command |

### Command API example

```json
POST /api/whatsapp/commands
{
  "intent": "assignment.accept",
  "entity_id": "allocation-uuid"
}
```

---

## Permissions

| Permission | Roles | Scope |
|------------|-------|-------|
| `whatsapp:read` | admin, talent_manager | Conversations, observability, approvals |
| `whatsapp:manage` | admin, talent_manager | Commands, approval resolution |
| `whatsapp:audit:read` | admin, talent_manager | Audit log access |

Freelancers interact via WhatsApp webhook (phone-linked identity); no REST permissions required.

---

## Freelancer Commands

| Message | Action |
|---------|--------|
| YES / NO | Respond to pending opportunity |
| ACCEPT ASSIGNMENT / REJECT ASSIGNMENT | Confirm or decline allocation |
| START | Begin current milestone |
| SUBMIT | Submit milestone for review |
| DELIVER / SEND DELIVERABLE | Submit project deliverable |
| APPROVE / REVISION | Milestone review (managers) |
| APPROVE PROJECT | Activate project (managers) |
| APPROVE REQUEST / REJECT REQUEST | Resolve workflow approval |
| STATUS | List active projects |
| HELP | Show command menu |
| STOP | Opt out |
| Free text | AI agent (when configured) |

---

## Workflow Integration

Domain events emitted for WhatsApp activity (unchanged + extended):

- `whatsapp.inbound` — all messages
- `whatsapp.intent_handled` — successful intent execution
- `whatsapp.agent_requested` — AI agent invoked
- `whatsapp.opt_out` — user opted out

n8n receives `whatsapp.business_action` for new business operations.

Workflows in `lib/workflows/registry.ts` and business workflows (`modules/workflow-engine/business-workflows.ts`) can react to these events.

---

## Database

| Table | Purpose |
|-------|---------|
| `whatsapp_conversations` | Session context (extended with `memory_summary`, `pending_approval_id`) |
| `whatsapp_memory_entries` | Turn-by-turn conversation memory |
| `whatsapp_audit_logs` | Platform operation audit trail |
| `whatsapp_approval_gates` | Workflow approval ↔ WhatsApp session links |
| `whatsapp_messages` | Raw message log (migration 001) |

RPC: `get_whatsapp_module_summary(tenant_id)` — observability metrics.

---

## Related Documentation

- Legacy interface overview: `docs/32-whatsapp-interface.md`
- Workflow Engine: `docs/Architecture/WORKFLOW_ENGINE.md`
- AI Gateway: `docs/27-ai-gateway.md`

---

## Testing

Unit tests: `tests/unit/whatsapp-platform-module.service.test.ts`

Run: `npm test -- tests/unit/whatsapp-platform-module.service.test.ts`
