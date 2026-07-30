# WhatsApp First-Class Interface

WhatsApp is a primary user interface for freelancers, not just a notification channel. All business logic flows through existing services — no duplicated orchestration.

## Architecture

```
Meta Webhook → parseMetaWebhook (parser)
            → WhatsAppService.processInboundMessage
                 → ConversationContext (whatsapp_conversations)
                 → detectIntent (intents)
                 → handleWhatsAppIntent (handlers → services)
                 → domain_events (workflow integration)
                 → n8n outbound (confirmations, agent replies)
```

## Modules

| Module | Path | Role |
|---|---|---|
| Message Parser | `lib/whatsapp/parser.ts` | Meta webhook → normalized messages (text, button, interactive) |
| Intent Detection | `lib/whatsapp/intents.ts` | Keyword + context-aware intent routing |
| Conversation Context | `lib/whatsapp/conversation` + `whatsapp_conversations` table | Active entity, session state |
| Handlers | `lib/whatsapp/handlers.ts` | Intent → service delegation |
| Orchestrator | `lib/services/whatsapp.service.ts` | First-class WhatsAppService |

## Intents → Services (no duplicate logic)

| Intent | Delegates to |
|---|---|
| `opportunity.interested/declined` | `CRMService.respondToPendingOpportunity()` |
| `milestone.submit` | `WorkflowService.submitMilestone()` |
| `milestone.start` | `WorkflowService.updateMilestoneStatus()` |
| `project.status` | `ProjectService.getFreelancerProjectSummary()` |
| `opt_out` | `WorkflowService.emitEvent('whatsapp.opt_out')` |
| `agent.query` | `AiGateway.complete()` via `WhatsAppService.runAgentQuery()` |
| `help` | Static menu (n8n sends template) |

## Workflow integration

Domain events emitted for every inbound message:

- `whatsapp.inbound` — all messages
- `whatsapp.intent_handled` — successful intent execution
- `whatsapp.agent_requested` — AI agent invoked
- `whatsapp.opt_out` — user opted out

These trigger workflows in `lib/workflows/registry.ts`.

## Freelancer commands

| Message | Action |
|---|---|
| YES / NO | Respond to pending opportunity |
| START | Begin current milestone |
| SUBMIT | Submit milestone for review |
| STATUS | List active projects |
| HELP | Show command menu |
| STOP | Opt out |
| Free text | AI agent (when configured) |

## Migration

`015_whatsapp_conversations.sql` adds per-freelancer conversation context.
