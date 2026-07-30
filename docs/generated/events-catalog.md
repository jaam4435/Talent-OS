<!-- AUTO-GENERATED — do not edit manually. Run: npm run events:catalog -->
# Event Catalog (Generated)

| Type | Category | Domain | Aggregate | Emitter | Description |
|---|---|---|---|---|---|
| `agent.session_completed` | application | agents | agents | agents module | session completed |
| `agent.session_started` | application | agents | agents | agents module | session started |
| `ai.brief_parse_requested` | application | ai | ai | ai module | brief parse requested |
| `ai.match_completed` | integration | integrations | ai_request | IntegrationService | n8n AI match callback |
| `ai.match_requested` | application | ai | ai | ai module | match requested |
| `ai.status_assessment_requested` | application | ai | project | AIService | AI status assessment requested |
| `ai.summary_requested` | application | ai | project | AIService | AI summary requested |
| `assignment.match_scored` | domain | assignment | assignment | assignment module | match scored |
| `domain_event.emitted` | domain | workflow | workflow | workflow module | domain event emitted |
| `email.sent` | integration | integrations | email | IntegrationService | n8n email callback |
| `integration.webhook_received` | integration | integrations | integrations | integrations module | webhook received |
| `knowledge.embedding_completed` | application | knowledge | knowledge | knowledge module | embedding completed |
| `knowledge.embedding_requested` | application | knowledge | knowledge | knowledge module | embedding requested |
| `knowledge.entry_created` | application | knowledge | knowledge | knowledge module | entry created |
| `marketplace.profile_published` | domain | marketplace | marketplace | marketplace module | profile published |
| `milestone.approved` | domain | projects | milestone | WorkflowService | Manager approved milestone |
| `milestone.overdue` | domain | projects | milestone | Cron | Milestone past due date |
| `milestone.revision_requested` | domain | projects | milestone | WorkflowService | Manager requested revision |
| `milestone.submitted` | domain | projects | projects | projects module | milestone submitted |
| `notification.created` | application | notifications | notifications | notifications module | notification created |
| `opportunity.broadcast` | domain | crm | crm | crm module | opportunity broadcast |
| `opportunity.opened` | domain | crm | crm | crm module | opportunity opened |
| `opportunity.response` | domain | crm | opportunity | CRMService | Freelancer responded to opportunity |
| `payment.approved` | domain | finance | finance | finance module | payment approved |
| `payment.disputed` | domain | finance | finance | finance module | payment disputed |
| `payment.paid` | domain | finance | finance | finance module | payment paid |
| `payment.pending` | domain | finance | payment | DB trigger | Payment status changed (DB trigger) |
| `project.assigned` | domain | projects | project | ProjectService | Project assigned to freelancer |
| `project.created` | domain | projects | projects | projects module | project created |
| `shortlist.updated` | domain | assignment | assignment | assignment module | shortlist updated |
| `talent.freelancer_created` | domain | talent | talent | talent module | freelancer created |
| `talent.freelancer_updated` | domain | talent | talent | talent module | freelancer updated |
| `whatsapp.agent_requested` | application | whatsapp | whatsapp | WhatsAppService | WhatsApp agent query |
| `whatsapp.inbound` | application | whatsapp | whatsapp | WhatsAppService | Inbound WhatsApp message |
| `whatsapp.intent_handled` | application | whatsapp | whatsapp | WhatsAppService | WhatsApp intent handled |
| `whatsapp.opt_out` | application | whatsapp | whatsapp | WhatsAppService | WhatsApp opt out |
| `whatsapp.send_completed` | integration | integrations | whatsapp | IntegrationService | n8n WhatsApp callback |
| `whatsapp.send_requested` | application | whatsapp | whatsapp | WorkflowService | WhatsApp send queued |
| `whatsapp.unrecognized` | application | whatsapp | whatsapp | WhatsAppService | Unrecognized WhatsApp message |

**Total:** 39 documented events

Authoritative registry: [`lib/events/catalog.ts`](../lib/events/catalog.ts)
