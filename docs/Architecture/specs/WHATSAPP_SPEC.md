# WhatsApp Channel — Implementation Specification

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Draft — awaiting approval  
**Bounded context:** WhatsApp Channel Interface  
**References:** `DOMAIN_MODEL.md`, `CONTEXT_MAP.md`, `EVENT_CATALOG.md`, `UBIQUITOUS_LANGUAGE.md`

---

## 1. Business Overview

The WhatsApp Channel context is the **first-class business channel** for freelancers and managers: inbound message processing, intent detection, conversation memory, audit, approval resolution, and delegation to owning bounded contexts without duplicated business logic.

**Primary actors:** Freelancer (primary channel user), talent manager (commands, approvals)  
**Business outcome:** Execute business operations via WhatsApp with full audit trail and AI fallback.

---

## 2. Responsibilities

### In scope

- Meta webhook verification and inbound message parsing
- Intent detection (keywords, context boost, AI fallback)
- Conversation session management and memory
- Business command execution (delegates to CRM, Project, Assignment, Workflow)
- Workflow approval gate registration and resolution
- Platform audit logging
- Manager REST APIs (conversations, commands, approvals, observability)
- Outbound confirmations via n8n

### Out of scope

- Business entity logic (owning contexts)
- AI provider routing (AI Gateway BC)
- Workflow definition (Workflow BC)
- Payment processing (Finance BC)

**Design principle:** All business mutations delegate to existing module services.

---

## 3. Public APIs

### Webhook (Meta)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/webhooks/whatsapp` | Verify token | Meta webhook verification |
| POST | `/api/webhooks/whatsapp` | HMAC signature | Inbound message processing |

### Manager REST

Base path: `/api/whatsapp`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/whatsapp/conversations` | `whatsapp:read` | List active conversations |
| GET | `/api/whatsapp/conversations/{freelancerId}` | `whatsapp:read` | Conversation + memory |
| GET | `/api/whatsapp/audit-logs` | `whatsapp:audit:read` | Paginated audit |
| GET | `/api/whatsapp/observability` | `whatsapp:read` | Module metrics |
| GET | `/api/whatsapp/approvals` | `whatsapp:read` | Pending gates |
| POST | `/api/whatsapp/approvals/{id}` | `whatsapp:manage` | Resolve approval |
| POST | `/api/whatsapp/commands` | `whatsapp:manage` | Execute business command |

---

## 4. Internal Services

| Service | Path | Role |
|---------|------|------|
| **WhatsAppPlatformModuleService** | `lib/services/whatsapp-platform-module.service.ts` | Memory, audit, commands, inbound processing |
| **WhatsAppService** | `lib/services/whatsapp.service.ts` | Legacy orchestration, agent queries, n8n payloads |
| **Intent detection** | `lib/whatsapp/intents.ts` | Keywords + context + AI fallback |
| **Handlers** | `lib/whatsapp/handlers.ts` | Intent → delegate to owning service |
| **Parser** | `lib/whatsapp/parser.ts` | Meta webhook normalization |

**Module layer:** `modules/whatsapp-platform/` — types, validation, `WHATSAPP_EVENT_TYPES`, `WHATSAPP_PLATFORM_INTENTS`

**Repositories:** `WhatsappConversationRepository`, `WhatsappMessageRepository`, `WhatsappMemoryRepository`, `WhatsappAuditRepository`, `WhatsappApprovalGateRepository`, `WebhookDeliveryRepository`

---

## 5. Database Schema

**Migrations:** `015_whatsapp_conversations.sql`, `030_whatsapp_platform_module.sql`

| Table | Purpose |
|-------|---------|
| `whatsapp_conversations` | Session context, active entity, memory summary |
| `whatsapp_messages` | Raw inbound/outbound message log |
| `whatsapp_memory_entries` | Turn history for AI context |
| `whatsapp_audit_logs` | Platform operation audit |
| `whatsapp_approval_gates` | Workflow approval ↔ WhatsApp session link |
| `webhook_deliveries` | Idempotency tracking |

**RLS:** Manager read/write; system service role for webhook processing.

---

## 6. Aggregates

| Aggregate | Root table | Invariants |
|-----------|------------|------------|
| **Conversation** | `whatsapp_conversations` | One active session per freelancer per tenant |
| **InboundMessage** | `whatsapp_messages` | Idempotent via `wa-inbound:{messageId}` |
| **ApprovalGate** | `whatsapp_approval_gates` | Links to `approval_requests`; resolved once |

**Conversation context:** `active_intent`, `active_entity_type`, `active_entity_id` drive context-aware intent detection.

---

## 7. Domain Events

Namespace: `WHATSAPP_EVENT_TYPES` in `modules/whatsapp-platform/types.ts`.

| Event | Trigger |
|-------|---------|
| `whatsapp.inbound` | Message received |
| `whatsapp.intent_handled` | Intent successfully processed |
| `whatsapp.agent_requested` | Free-text routed to AI |
| `whatsapp.opt_out` | User opts out |
| `whatsapp.command.executed` | Manager command API |
| `whatsapp.approval.resolved` | Approval gate resolved |
| `whatsapp.memory.recorded` | Memory entry appended |
| `whatsapp.workflow.triggered` | Manual workflow trigger |
| `whatsapp.notification.sent` | Notification dispatched |

**Legacy:** `whatsapp.unrecognized` (flat string)

---

## 8. Commands

| Command | Handler | Delegates to |
|---------|---------|--------------|
| ProcessInboundMessage | `processInboundMessage()` | Intent pipeline |
| ExecuteBusinessCommand | `executeCommand()` | Handler → owning service |
| ResolveApprovalViaWhatsApp | Handler | `WorkflowEngineModuleService.resolveApproval()` |
| RunAgentQuery | `WhatsAppService.runAgentQuery()` | `AiGateway.complete()` |
| RegisterApprovalGate | `registerApprovalGate()` | Links approval to session |
| CreateOpportunity | `opportunity.create` intent | `CRMService.createOpportunity()` |
| RespondToOpportunity | `opportunity.interested/declined` | `CRMService.respondToPendingOpportunity()` |
| AcceptAssignment | `assignment.accept` | `AssignmentModuleService.updateAllocation()` |
| RejectAssignment | `assignment.reject` | `AssignmentModuleService.cancelAllocation()` |
| SubmitMilestone | `milestone.submit` | `WorkflowService.submitMilestone()` |
| ApproveMilestone | `milestone.approve` | `WorkflowService.reviewMilestone()` |
| RequestRevision | `milestone.revision` | `WorkflowService.reviewMilestone()` |
| SubmitDeliverable | `deliverable.submit` | `ProjectModuleService` |
| ApproveProject | `project.approve` | `ProjectModuleService.transitionStatus()` |
| TriggerWorkflow | `workflow.trigger` | `WorkflowEngineModuleService.triggerManual()` |

---

## 9. Queries

| Query | Returns |
|-------|---------|
| ListConversations | Active sessions with last message |
| GetConversation | Session + memory entries |
| ListAuditLogs | Paginated platform audit |
| GetObservability | Message volume, intent distribution, unresolved gates |
| ListPendingApprovals | Approval gates awaiting resolution |
| FindByPhone | Freelancer identity (via TalentService) |

---

## 10. Validation Rules

**Source:** `modules/whatsapp-platform/validation.ts`

| Rule | Field | Constraint |
|------|-------|------------|
| Command intent | `intent` | Valid `WhatsAppPlatformIntent` enum |
| Freelancer ID | `freelancerId` | UUID; must exist in tenant |
| Approval action | `action` | approve or reject |
| Webhook payload | Meta schema | Valid message structure |
| Idempotency | `messageId` | Duplicate inbound rejected |

**Business rules:**

- Freelancer identity resolved by phone within tenant
- Context-aware intent: active entity beats generic YES/NO keywords
- Opt-out clears active conversation entity
- All business mutations delegate — no local business state

---

## 11. Authorization Rules

| Permission | Roles | Operations |
|------------|-------|------------|
| `whatsapp:read` | admin, talent_manager | Conversations, observability, approvals list |
| `whatsapp:manage` | admin, talent_manager | Commands, approval resolution |
| `whatsapp:audit:read` | admin, talent_manager | Audit logs |

**Webhook:** No user session; validated via Meta signature + verify token.

**Freelancer channel:** Identity via phone → talent record; no RBAC session required for inbound.

---

## 12. AI Capabilities

| Feature | Trigger | Output |
|---------|---------|--------|
| **Intent fallback** | Message ≥ 8 chars, no keyword match | Routes to `agent.query` |
| **Agent query** | `agent.query` intent | `AiGateway.complete()` with conversation memory |
| **Memory context** | Every turn | Prior turns from `whatsapp_memory_entries` |

**Detection pipeline:**

1. Keyword match (YES/NO, SUBMIT, ACCEPT ASSIGNMENT, etc.)
2. Context boost (active entity type/id)
3. AI fallback for free text

---

## 13. Background Jobs

| Job | Trigger | Action |
|-----|---------|--------|
| Domain event dispatch | Cron | Process `whatsapp.*` events |
| Outbound n8n | After intent handled | Confirmation/reply messages |
| Memory cleanup | Future cron | Archive old memory entries |

---

## 14. Integrations

| System | Direction | Purpose |
|--------|-----------|---------|
| **Meta WhatsApp Business API** | Inbound/outbound | Webhook + message send |
| **CRM BC** | Outbound delegate | Opportunity create/respond |
| **Project BC** | Outbound delegate | Deliverables, status |
| **Assignment BC** | Outbound delegate | Accept/reject allocation |
| **Workflow BC** | Bidirectional | Approvals, milestone, manual trigger |
| **AI Gateway** | Outbound | Agent queries |
| **n8n** | Outbound | Reply delivery, confirmations |
| **Talent BC** | Inbound | Phone → freelancer identity |
| **Notifications** | Outbound | In-app notifications |

---

## 15. Observability

| Signal | Source |
|--------|--------|
| Audit logs | `whatsapp_audit_logs` — all platform operations |
| Messages | `whatsapp_messages` — inbound volume |
| Domain events | `whatsapp.*` in `domain_events` |
| Observability endpoint | Intent distribution, active conversations |
| Webhook deliveries | Idempotency and failure tracking |

---

## 16. Testing Strategy

| Test | Focus |
|------|-------|
| Unit | Intent detection with context boost |
| Unit | YES/NO disambiguation (entity context before generic) |
| Integration | Webhook signature verification |
| Integration | Command API permission matrix |
| Integration | Approval gate resolution chain |
| E2E | Inbound YES → opportunity response → workflow |

**Coverage target:** 80% on intent detection and handler delegation paths.

---

## 17. Migration Strategy

| Migration | Content |
|-----------|---------|
| `015_whatsapp_conversations.sql` | Conversations, messages |
| `030_whatsapp_platform_module.sql` | Memory, audit, approval gates |
| Future | Multi-number tenant support |

---

## 18. Future Enhancements

1. **Rich media handling** — Document/image upload to storage
2. **Template messages** — Meta-approved outbound templates
3. **Multi-language intent** — Localized keyword tables
4. **Manager WhatsApp** — Separate manager phone routing
5. **Conversation analytics** — Intent success rate dashboard
6. **Proactive notifications** — Outbound business alerts via WhatsApp

---

## Appendix — File map

| Artifact | Path |
|----------|------|
| Types | `modules/whatsapp-platform/types.ts` |
| Module service | `lib/services/whatsapp-platform-module.service.ts` |
| Intents | `lib/whatsapp/intents.ts` |
| Handlers | `lib/whatsapp/handlers.ts` |
| Webhook | `app/api/webhooks/whatsapp/route.ts` |
| Routes | `app/api/whatsapp/**` |
| Architecture doc | `docs/Architecture/WHATSAPP_PLATFORM.md` |
