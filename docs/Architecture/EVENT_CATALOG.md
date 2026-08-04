# Talent OS — Event Catalog

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Draft — awaiting approval

---

## Overview

Talent OS uses an **outbox pattern**: domain mutations emit rows to `domain_events`. A cron dispatcher (`/api/cron/dispatch-events`) feeds the **Workflow Engine**, which matches events to workflow definitions and enqueues jobs.

### Event envelope

| Field | Description |
|-------|-------------|
| `event_type` | Published language string (see catalog below) |
| `tenant_id` | Organization scope |
| `aggregate_type` | Source entity type (e.g. `project`, `freelancer`) |
| `aggregate_id` | Source entity UUID |
| `payload` | JSON context for workflow conditions and steps |
| `actor_id` | User who triggered the mutation (nullable for system) |
| `correlation_id` | Trace across workflow run |
| `idempotency_key` | Deduplication key |

### Emission paths

| Path | Location |
|------|----------|
| Module services | `*ModuleService.auditAndEmit()` → `WorkflowService.emitEvent()` |
| Legacy services | Direct `WorkflowService.emitEvent()` |
| DB triggers | `005_event_infrastructure.sql` — `opportunity.opened`, `payment.{status}` |
| Workflow actions | `emit_event` step in `lib/workflows/actions.ts` |
| WhatsApp platform | Audit actions mapped to `WHATSAPP_EVENT_TYPES` |

---

## Organization events

| Event type | Constant | Trigger | Aggregate | Workflow consumers |
|------------|----------|---------|-----------|-------------------|
| `organization.updated` | `ORGANIZATION_EVENT_TYPES.UPDATED` | Profile/settings change | Organization | — |
| `organization.branding.updated` | `BRANDING_UPDATED` | Logo/colors change | Organization | — |
| `organization.member.invited` | `MEMBER_INVITED` | Invite sent | Invite | — |
| `organization.member.role_changed` | `MEMBER_ROLE_CHANGED` | Role update | Member | — |
| `organization.member.suspended` | `MEMBER_SUSPENDED` | Member suspended | Member | — |
| `organization.member.removed` | `MEMBER_REMOVED` | Member removed | Member | — |
| `organization.invite.revoked` | `INVITE_REVOKED` | Invite canceled | Invite | — |
| `organization.department.created` | `DEPARTMENT_CREATED` | Dept created | Department | — |
| `organization.department.updated` | `DEPARTMENT_UPDATED` | Dept updated | Department | — |
| `organization.department.deleted` | `DEPARTMENT_DELETED` | Dept soft deleted | Department | — |
| `organization.team.created` | `TEAM_CREATED` | Team created | Team | — |
| `organization.team.updated` | `TEAM_UPDATED` | Team updated | Team | — |
| `organization.team.deleted` | `TEAM_DELETED` | Team soft deleted | Team | — |

**Source:** `OrganizationService`  
**Module constant:** `modules/organization/types.ts`

---

## CRM events (sales pipeline)

| Event type | Constant | Trigger | Aggregate |
|------------|----------|---------|-----------|
| `crm.lead.created` | `CRM_EVENT_TYPES.LEAD_CREATED` | Lead created | Lead |
| `crm.lead.status_changed` | `LEAD_STATUS_CHANGED` | Lead status update | Lead |
| `crm.lead.converted` | `LEAD_CONVERTED` | Lead → client conversion | Lead |
| `crm.company.created` | `COMPANY_CREATED` | Company created | Company |
| `crm.company.updated` | `COMPANY_UPDATED` | Company updated | Company |
| `crm.contact.created` | `CONTACT_CREATED` | Contact created | Contact |
| `crm.deal.created` | `DEAL_CREATED` | Deal created | Deal |
| `crm.deal.stage_changed` | `DEAL_STAGE_CHANGED` | Pipeline move | Deal |
| `crm.contract.created` | `CONTRACT_CREATED` | Contract drafted | Contract |
| `crm.contract.signed` | `CONTRACT_SIGNED` | Contract signed | Contract |
| `crm.note.created` | `NOTE_CREATED` | Note added | Note |
| `crm.activity.logged` | `ACTIVITY_LOGGED` | Activity recorded | Activity |

**Workflow triggers:**
- `crm.lead.status_changed` (status=qualified) → `wf-lead-qualification`
- `crm.lead.converted` → `wf-client-onboarding`

**Source:** `CrmDemandService`  
**Module constant:** `modules/crm/types.ts`

---

## Talent demand events (legacy)

| Event type | Trigger | Aggregate | Workflow consumers |
|------------|---------|-----------|-------------------|
| `opportunity.broadcast` | Shortlist broadcast sent | Opportunity | `notify-freelancers`, WhatsApp templates |
| `opportunity.response` | Freelancer responds interested/declined | OpportunityRecipient | Match/assignment flows |
| `opportunity.opened` | **DB trigger** — status → `open` | Opportunity | `notify-managers-opportunity-opened` |

**Source:** `AssignmentService`, `CRMService`, DB trigger (005)  
**Note:** Legacy flat naming; not in `CRM_EVENT_TYPES`.

---

## Talent supply events

| Event type | Constant | Trigger | Aggregate |
|------------|----------|---------|-----------|
| `talent.created` | `TALENT_EVENT_TYPES.CREATED` | Freelancer created | Talent |
| `talent.updated` | `UPDATED` | Profile updated | Talent |
| `talent.deleted` | `DELETED` | Soft delete | Talent |
| `talent.experience.added` | `EXPERIENCE_ADDED` | Experience row added | Experience |
| `talent.experience.updated` | `EXPERIENCE_UPDATED` | Experience updated | Experience |
| `talent.document.added` | `DOCUMENT_ADDED` | Document uploaded | Document |
| `talent.availability.updated` | `AVAILABILITY_UPDATED` | Slot changed | AvailabilitySlot |
| `talent.import.completed` | `IMPORT_COMPLETED` | Batch import finished | ImportBatch |
| `talent.completeness.updated` | `COMPLETENESS_UPDATED` | Score recalculated | Talent |

**Source:** `TalentModuleService`  
**Module constant:** `modules/talent/types.ts`

---

## Project delivery events

### Module (namespaced)

| Event type | Constant | Trigger | Aggregate |
|------------|----------|---------|-----------|
| `project.created` | `PROJECT_EVENT_TYPES.CREATED` | Project created | Project |
| `project.updated` | `UPDATED` | Project fields changed | Project |
| `project.status_changed` | `STATUS_CHANGED` | Status transition | Project |
| `project.deleted` | `DELETED` | Soft delete | Project |
| `project.milestone.updated` | `MILESTONE_UPDATED` | Milestone fields changed | Milestone |
| `project.task.created` | `TASK_CREATED` | Task created | Task |
| `project.task.completed` | `TASK_COMPLETED` | Task done | Task |
| `project.deliverable.submitted` | `DELIVERABLE_SUBMITTED` | Deliverable submitted | Deliverable |
| `project.comment.added` | `COMMENT_ADDED` | Comment posted | Comment |
| `project.dependency.added` | `DEPENDENCY_ADDED` | Dependency linked | Dependency |
| `project.health.updated` | `HEALTH_UPDATED` | Health recalculated | Project |
| `project.template.applied` | `TEMPLATE_APPLIED` | Template applied | Project |

**Workflow triggers:**
- `project.created` → `wf-project-creation`
- `project.deliverable.submitted` → `wf-qa`
- `project.status_changed` (status=completed) → `wf-project-closure`

### Legacy (flat)

| Event type | Trigger | Source |
|------------|---------|--------|
| `project.assigned` | Freelancer assigned to project | `ProjectService` |
| `milestone.submitted` | Freelancer submits milestone | `WorkflowService` |
| `milestone.approved` | Manager approves milestone | `WorkflowService` |
| `milestone.revision_requested` | Manager requests revision | `WorkflowService` |
| `milestone.overdue` | AI status assessment detects overdue | `lib/integrations/ai/status-assessment.ts` |
| `project.closed` | Workflow step emits on closure | `lib/workflows/actions.ts` |

**Workflow triggers:**
- `milestone.submitted` → notify managers, QA prep
- `milestone.approved` → `wf-delivery`
- `milestone.revision_requested` → notify freelancer
- `milestone.overdue` → escalation workflow

**Module constant:** `modules/project/types.ts`

---

## Assignment events

| Event type | Constant | Trigger | Aggregate |
|------------|----------|---------|-----------|
| `assignment.created` | `ASSIGNMENT_EVENT_TYPES.CREATED` | Allocation created | Allocation |
| `assignment.updated` | `UPDATED` | Fields changed | Allocation |
| `assignment.status_changed` | `STATUS_CHANGED` | Status transition | Allocation |
| `assignment.canceled` | `CANCELED` | Allocation canceled | Allocation |
| `assignment.conflict.detected` | `CONFLICT_DETECTED` | Conflict found | Conflict |
| `assignment.conflict.resolved` | `CONFLICT_RESOLVED` | Conflict resolved | Conflict |
| `assignment.capacity.updated` | `CAPACITY_UPDATED` | Capacity changed | Capacity |
| `assignment.schedule.added` | `SCHEDULE_ADDED` | Schedule entry added | Schedule |
| `assignment.suggestion.generated` | `SUGGESTION_GENERATED` | AI suggestions computed | — (read model) |

**Workflow trigger:** `assignment.created` → `wf-assignment`

**Source:** `AssignmentModuleService`  
**Module constant:** `modules/assignment/types.ts`

---

## Finance / payment events

| Event type | Trigger | Aggregate | Source |
|------------|---------|-----------|--------|
| `payment.pending` | Payment created | Payment | DB trigger (005) |
| `payment.approved` | Manager approves | Payment | DB trigger |
| `payment.processing` | Processing started | Payment | DB trigger |
| `payment.paid` | Marked paid with reference | Payment | DB trigger |
| `payment.disputed` | Dispute opened | Payment | DB trigger |
| `payment.canceled` | Payment canceled | Payment | DB trigger |

**Workflow triggers:**
- `payment.approved` → `wf-invoice`
- `payment.paid` → notify stakeholders

**Note:** `FinanceService` does not emit events directly; PostgreSQL triggers on `payments` UPDATE emit to outbox.

---

## Workflow engine meta-events

| Event type | Constant | Trigger |
|------------|----------|---------|
| `workflow.run.started` | `WORKFLOW_EVENT_TYPES.RUN_STARTED` | Run created |
| `workflow.run.completed` | `RUN_COMPLETED` | All jobs done |
| `workflow.run.failed` | `RUN_FAILED` | Run failed |
| `workflow.step.started` | `STEP_STARTED` | Job execution begins |
| `workflow.step.completed` | `STEP_COMPLETED` | Job succeeds |
| `workflow.step.failed` | `STEP_FAILED` | Job fails |
| `workflow.compensation.triggered` | `COMPENSATION_TRIGGERED` | Dead letter → compensate |
| `workflow.compensation.completed` | `COMPENSATION_COMPLETED` | Compensation done |
| `workflow.retry.requested` | `RETRY_REQUESTED` | Manual/API retry |
| `workflow.definition.created` | `DEFINITION_CREATED` | Custom definition saved |
| `workflow.definition.updated` | `DEFINITION_UPDATED` | Definition updated |
| `workflow.approval.approved` | (audit action) | Human approval granted |
| `workflow.approval.rejected` | (audit action) | Human approval denied |

**Source:** `WorkflowEngineModuleService`, `lib/workflows/engine.ts`  
**Module constant:** `modules/workflow-engine/types.ts`

---

## WhatsApp channel events

| Event type | Constant | Trigger |
|------------|----------|---------|
| `whatsapp.inbound` | `WHATSAPP_EVENT_TYPES.INBOUND` | Any inbound message |
| `whatsapp.intent_handled` | `INTENT_HANDLED` | Intent successfully executed |
| `whatsapp.agent_requested` | `AGENT_REQUESTED` | AI agent invoked |
| `whatsapp.opt_out` | `OPT_OUT` | User sends STOP |
| `whatsapp.command.executed` | `COMMAND_EXECUTED` | REST/API command |
| `whatsapp.approval.resolved` | `APPROVAL_RESOLVED` | Approval gate resolved |
| `whatsapp.memory.recorded` | `MEMORY_RECORDED` | Memory entry appended |
| `whatsapp.workflow.triggered` | `WORKFLOW_TRIGGERED` | Manual workflow via WhatsApp |
| `whatsapp.notification.sent` | `NOTIFICATION_SENT` | Notification dispatched |
| `whatsapp.unrecognized` | *(legacy string)* | Unhandled message / agent failure |

**Workflow triggers:**
- `whatsapp.inbound` → logging/routing workflows
- `whatsapp.agent_requested` → agent response workflow
- `whatsapp.opt_out` → compliance/opt-out workflow

**Source:** `WhatsAppService`, `WhatsAppPlatformModuleService`, `lib/whatsapp/handlers.ts`  
**Module constant:** `modules/whatsapp-platform/types.ts`

---

## AI platform events

### Integration request events

| Event type | Trigger | Feature |
|------------|---------|---------|
| `ai.match_requested` | Talent match initiated | `talent_match` |
| `ai.brief_parse_requested` | Brief parsing initiated | `brief_parse` |
| `ai.summary_requested` | Summary generation | `project_summary`, `shortlist_summary` |
| `ai.status_assessment_requested` | Status assessment run | `status_assessment` |

**Workflow trigger:** `ai.match_requested` → `wf-talent-matching`

**Source:** `lib/integrations/ai/matching.ts`, `brief-parse.ts`, `summary.ts`, `status-assessment.ts`

### Platform lifecycle events

| Event type | Constant | Trigger |
|------------|----------|---------|
| `ai.request.started` | `AI_EVENTS.REQUEST_STARTED` | Gateway begins request |
| `ai.request.completed` | `REQUEST_COMPLETED` | Gateway succeeds |
| `ai.request.failed` | `REQUEST_FAILED` | Gateway fails |
| `ai.budget.threshold` | `BUDGET_THRESHOLD` | Monthly limit approached |

**Source:** `modules/platform/events/catalog.ts`, AI gateway pipeline

---

## Platform core events

| Event type | Constant | Trigger |
|------------|----------|---------|
| `platform.product.registered` | `PLATFORM_EVENTS.PRODUCT_REGISTERED` | Product registration |
| `platform.feature_flag.changed` | `FEATURE_FLAG_CHANGED` | Flag toggle |
| `platform.config.updated` | `CONFIG_UPDATED` | Config change |
| `platform.context.resolved` | `CONTEXT_RESOLVED` | Tenant context resolved |

**Source:** `modules/platform/events/`

---

## Business workflow trigger map

Nine reusable business workflows (`modules/workflow-engine/business-workflows.ts`):

| Workflow ID | Trigger event | Condition |
|-------------|---------------|-----------|
| `wf-lead-qualification` | `crm.lead.status_changed` | status = qualified |
| `wf-client-onboarding` | `crm.lead.converted` | — |
| `wf-project-creation` | `project.created` | — |
| `wf-talent-matching` | `ai.match_requested` | — |
| `wf-assignment` | `assignment.created` | — |
| `wf-qa` | `project.deliverable.submitted` | — |
| `wf-delivery` | `milestone.approved` | — |
| `wf-invoice` | `payment.approved` | — |
| `wf-project-closure` | `project.status_changed` | status = completed |

---

## Legacy workflow registry triggers

Additional workflows in `lib/workflows/registry.ts` (24 total including business):

| Event type | Workflow purpose (summary) |
|------------|---------------------------|
| `opportunity.broadcast` | Notify freelancers |
| `opportunity.opened` | Notify managers |
| `opportunity.response` | Process response |
| `project.assigned` | Onboarding freelancer |
| `milestone.submitted` | Notify managers |
| `milestone.approved` | Delivery + payment prep |
| `milestone.revision_requested` | Notify freelancer |
| `milestone.overdue` | Escalation |
| `payment.approved` | Invoice generation |
| `payment.paid` | Payment confirmation |
| `whatsapp.inbound` | Message logging |
| `whatsapp.agent_requested` | Agent reply dispatch |
| `whatsapp.opt_out` | Compliance |

---

## Event naming conventions

| Pattern | Example | Status |
|---------|---------|--------|
| `{context}.{aggregate}.{action}` | `crm.lead.created` | **Preferred** (module services) |
| `{aggregate}.{action}` | `milestone.submitted` | Legacy (still active) |
| `{channel}.{action}` | `whatsapp.inbound` | Channel events |
| `{provider}.{action}` | `payment.approved` | DB-triggered |
| `workflow.{concept}.{action}` | `workflow.run.started` | Meta/orchestration |

**Recommendation for new events:** Always use namespaced `{context}.{entity}.{past_tense_verb}`.

---

## Events by aggregate type

| Aggregate type | Example events |
|----------------|----------------|
| `lead` | `crm.lead.*` |
| `freelancer` | `talent.*`, `whatsapp.*` (inbound) |
| `project` | `project.*`, `milestone.*`, `project.assigned` |
| `allocation` | `assignment.*` |
| `milestone` | `milestone.*`, `payment.*` |
| `opportunity` | `opportunity.*` |
| `workflow_run` | `workflow.run.*`, `workflow.step.*` |
| `approval_request` | `workflow.approval.*`, `whatsapp.approval.resolved` |

---

## Idempotency key patterns

| Pattern | Example |
|---------|---------|
| Entity mutation | `milestone-submitted:{milestoneId}` |
| WhatsApp inbound | `whatsapp-inbound:{waMessageId}` |
| WhatsApp intent | `whatsapp-intent:{waMessageId}:{intent}` |
| Manual workflow | `manual:{workflowId}:{aggregateId}:{timestamp}` |
| Webhook delivery | `wa-inbound:{waMessageId}` |

---

## Related documents

- [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) — aggregate definitions
- [CONTEXT_MAP.md](./CONTEXT_MAP.md) — who publishes/consumes events
- [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md) — term definitions
- [WORKFLOW_ENGINE.md](./WORKFLOW_ENGINE.md) — execution model
