# WhatsApp First-Class Interface

Architecture for WhatsApp as a peer channel to the Web UI — all business logic flows through existing domain services.

## Pipeline

```
Meta webhook → WhatsAppService.processInboundMessage
  → ConversationContextManager (turn history + active entity)
  → detectIntent (keywords + approval pinning + context boost)
  → routeIntent (INTENT_REGISTRY → handler → domain service)
  → emitIntentHandledEvent → workflow engine
  → buildN8nPayload → outbound template
```

## Components

| Component | Path | Role |
|-----------|------|------|
| Conversation context | `lib/whatsapp/conversation-context.ts` | Active entity, turn recording |
| Conversation memory | `lib/whatsapp/conversation-memory.ts` | JSONB turn history for AI + continuity |
| Intent detection | `lib/whatsapp/intents.ts` | Keywords, approval context, agent fallback |
| Intent registry | `lib/whatsapp/intent-registry.ts` | Declarative intent → handler → service map |
| Handlers | `lib/whatsapp/handlers.ts` | Thin adapters — delegate to services only |
| Workflow bridge | `lib/whatsapp/workflow-bridge.ts` | Standardized event emission |
| Web parity | `lib/whatsapp/parity.ts` | Manifest: web action ↔ WhatsApp intent |
| Orchestrator | `lib/services/whatsapp.service.ts` | Single inbound entry point |

## Web UI Parity

Every freelancer-facing web action maps to a WhatsApp command. See `lib/whatsapp/parity.ts`.

| Command | Web action | Service |
|---------|-----------|---------|
| YES / NO | `respondToOpportunity` | `CRMService` |
| OPPORTUNITIES | — | `CRMService.listPendingInvitesForFreelancer` |
| START / SUBMIT | `updateMilestoneStatus` / `submitMilestone` | `WorkflowService` |
| STATUS | project dashboard | `ProjectService` |
| ACCEPT | `updateProjectStatusAsFreelancer` | `ProjectService` |
| PAYMENTS | payments page | `FinanceService` |
| NOTIFICATIONS | notifications panel | `NotificationService` |
| APPROVALS | `listPendingApprovals` | `WorkflowEngineService` |
| APPROVE / REJECT | `resolveApproval` | `WorkflowEngineService` |
| AVAILABLE / BUSY / UNAVAILABLE | `updateOwnFreelancerProfile` | `TalentService.updateAvailability` |
| Free text | AI assistant | `WhatsAppService.runAgentQuery` |

Manager operations (`reviewMilestone`, `createProject`, etc.) remain web-only by design.

## Human Approval Flow

1. User sends `APPROVALS`
2. Handler lists pending approvals via `WorkflowEngineService.listPendingApprovals`
3. First approval is pinned in conversation context (`active_entity_type: approval_request`)
4. User sends `APPROVE` or `REJECT`
5. Handler calls `WorkflowEngineService.resolveApproval` — same path as web UI
6. Workflow engine runs onApproved/onRejected steps (n8n notify, etc.)

## Conversation Memory

Turns stored in `whatsapp_conversations.context.turns` (max 20):

- Inbound user messages recorded on receipt
- Assistant summaries recorded after successful handler
- Injected into agent prompt via `formatTurnsForPrompt`

## Workflows

| Workflow | Trigger |
|----------|---------|
| `wf-whatsapp-inbound` | `whatsapp.inbound` |
| `wf-whatsapp-agent` | `whatsapp.agent_requested` |
| `wf-whatsapp-opt-out` | `whatsapp.opt_out` |
| `wf-whatsapp-send` | `whatsapp.send_requested` |

## Outbound Events (n8n)

| Event | When |
|-------|------|
| `whatsapp.response_processed` | Opportunity YES/NO |
| `whatsapp.task_update` | Milestone START/SUBMIT |
| `whatsapp.project_status` | STATUS |
| `whatsapp.query_result` | List queries (opportunities, payments, notifications, approvals) |
| `whatsapp.action_completed` | Availability, project accept, approval resolve |
| `whatsapp.agent_response` | Free-text AI reply |
| `whatsapp.help` | HELP menu |

## Design Rules

1. **No duplicate business logic** — handlers call the same service methods as `app/actions/*`
2. **Single orchestrator** — `WhatsAppService.processInboundMessage` only
3. **Registry extensibility** — new intents = registry entry + handler + parity row
4. **Service → Repository → DB** — unchanged platform layering
