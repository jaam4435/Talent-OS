import { AgentEvents } from '@/modules/agents/events'
import { AiEvents } from '@/modules/ai/events'
import { AssignmentEvents } from '@/modules/assignment/events'
import { CrmEvents } from '@/modules/crm/events'
import { FinanceEvents } from '@/modules/finance/events'
import { IntegrationsEvents } from '@/modules/integrations/events'
import { KnowledgeEvents } from '@/modules/knowledge/events'
import { MarketplaceEvents } from '@/modules/marketplace/events'
import { NotificationsEvents } from '@/modules/notifications/events'
import { ProjectsEvents } from '@/modules/projects/events'
import { TalentEvents } from '@/modules/talent/events'
import { WhatsappEvents } from '@/modules/whatsapp/events'
import type { EventCatalogEntry, EventCategory } from '@/lib/events/types'

function entry(
  type: string,
  category: EventCategory,
  domain: string,
  description: string,
  aggregateType: string,
  emitter: string,
  extra?: Partial<EventCatalogEntry>
): EventCatalogEntry {
  return {
    type,
    category,
    domain,
    description,
    aggregateType,
    emitter,
    status: 'production',
    ...extra,
  }
}

/** Authoritative event catalog — every documented event in the platform. */
export const EVENT_CATALOG: readonly EventCatalogEntry[] = [
  entry(CrmEvents.OPPORTUNITY_OPENED, 'domain', 'crm', 'Opportunity opened for responses', 'opportunity', 'DB trigger / CRMService', {
    workflowId: 'wf-opportunity-opened',
    payloadKeys: ['title', 'created_by'],
    idempotencyPattern: 'opportunity.opened:{id}',
  }),
  entry(CrmEvents.OPPORTUNITY_BROADCAST, 'domain', 'crm', 'Opportunity broadcast to talent pool', 'opportunity', 'AssignmentService', {
    workflowId: 'wf-opportunity-broadcast',
    payloadKeys: ['opportunity_id', 'recipient_count'],
    idempotencyPattern: 'opportunity-broadcast:{id}',
  }),
  entry('opportunity.response', 'domain', 'crm', 'Freelancer responded to opportunity', 'opportunity', 'CRMService / WhatsAppService', {
    workflowId: 'wf-opportunity-response',
    payloadKeys: ['opportunity_id', 'freelancer_id', 'response'],
    idempotencyPattern: 'opportunity-response:{opportunity_id}:{freelancer_id}',
  }),
  entry('project.assigned', 'domain', 'projects', 'Project assigned to freelancer', 'project', 'ProjectService', {
    workflowId: 'wf-project-assigned',
    payloadKeys: ['project_id', 'freelancer_id', 'title'],
    idempotencyPattern: 'project-assigned:{project_id}',
  }),
  entry(ProjectsEvents.PROJECT_CREATED, 'domain', 'projects', 'Project record created', 'project', 'ProjectService', {
    status: 'planned',
    payloadKeys: ['project_id', 'title'],
  }),
  entry(ProjectsEvents.MILESTONE_SUBMITTED, 'domain', 'projects', 'Freelancer submitted milestone deliverables', 'milestone', 'WorkflowService', {
    workflowId: 'wf-milestone-submitted',
    payloadKeys: ['milestone_id', 'project_id', 'project_title'],
    idempotencyPattern: 'milestone-submitted:{milestone_id}',
  }),
  entry('milestone.approved', 'domain', 'projects', 'Manager approved milestone', 'milestone', 'WorkflowService', {
    workflowId: 'wf-milestone-approved',
    idempotencyPattern: 'milestone-approved:{milestone_id}',
  }),
  entry('milestone.revision_requested', 'domain', 'projects', 'Manager requested milestone revision', 'milestone', 'WorkflowService', {
    workflowId: 'wf-milestone-revision',
    idempotencyPattern: 'milestone-revision:{milestone_id}',
  }),
  entry('milestone.overdue', 'domain', 'projects', 'Milestone past due date', 'milestone', 'Cron / WorkflowService', {
    workflowId: 'wf-milestone-overdue',
    idempotencyPattern: 'milestone-overdue:{id}:{due_date}',
  }),
  entry(FinanceEvents.PAYMENT_APPROVED, 'domain', 'finance', 'Payment approved for disbursement', 'payment', 'FinanceService', {
    workflowId: 'wf-payment-approved',
    idempotencyPattern: 'payment-approved:{payment_id}',
  }),
  entry(FinanceEvents.PAYMENT_PAID, 'domain', 'finance', 'Payment marked as paid', 'payment', 'FinanceService', {
    workflowId: 'wf-payment-paid',
    idempotencyPattern: 'payment-paid:{payment_id}',
  }),
  entry(FinanceEvents.PAYMENT_DISPUTED, 'domain', 'finance', 'Payment flagged as disputed', 'payment', 'FinanceService', {
    idempotencyPattern: 'payment-disputed:{payment_id}',
  }),
  entry('payment.pending', 'domain', 'finance', 'Payment status changed (DB trigger)', 'payment', 'DB trigger', {
    idempotencyPattern: 'payment.pending:{id}',
  }),
  entry(AiEvents.MATCH_REQUESTED, 'application', 'ai', 'AI talent match requested', 'opportunity', 'AIService', {
    workflowId: 'wf-ai-match',
    payloadKeys: ['ai_request_id', 'opportunity_id'],
    idempotencyPattern: 'ai-match:{opportunity_id}:{request_id}',
  }),
  entry(AiEvents.BRIEF_PARSE_REQUESTED, 'application', 'ai', 'AI brief parse requested', 'opportunity', 'AIService', {
    workflowId: 'wf-ai-brief-parse',
    idempotencyPattern: 'ai-brief-parse:{opportunity_id}:{request_id}',
  }),
  entry(AiEvents.SUMMARY_REQUESTED, 'application', 'ai', 'AI summary generation requested', 'project', 'AIService', {
    workflowId: 'wf-ai-summary',
    idempotencyPattern: 'ai-summary:{entity}:{id}:{request_id}',
  }),
  entry(AiEvents.STATUS_ASSESSMENT_REQUESTED, 'application', 'ai', 'AI status assessment requested', 'project', 'AIService', {
    workflowId: 'wf-ai-status',
    idempotencyPattern: 'ai-status:{project_id}:{request_id}',
  }),
  entry(WhatsappEvents.INBOUND, 'application', 'whatsapp', 'Inbound WhatsApp message received', 'whatsapp', 'WhatsAppService', {
    workflowId: 'wf-whatsapp-inbound',
    payloadKeys: ['wa_message_id', 'phone', 'body', 'intent'],
    idempotencyPattern: 'whatsapp-inbound:{wa_message_id}',
  }),
  entry(WhatsappEvents.INTENT_HANDLED, 'application', 'whatsapp', 'WhatsApp intent processed', 'whatsapp', 'WhatsAppService', {
    idempotencyPattern: 'whatsapp-intent:{wa_message_id}:{intent}',
  }),
  entry(WhatsappEvents.AGENT_REQUESTED, 'application', 'whatsapp', 'WhatsApp agent query requested', 'whatsapp', 'WhatsAppService', {
    workflowId: 'wf-whatsapp-agent',
  }),
  entry(WhatsappEvents.OPT_OUT, 'application', 'whatsapp', 'User opted out of WhatsApp', 'whatsapp', 'WhatsAppService', {
    workflowId: 'wf-whatsapp-opt-out',
  }),
  entry(WhatsappEvents.UNRECOGNIZED, 'application', 'whatsapp', 'Unrecognized WhatsApp message', 'whatsapp', 'WhatsAppService', {}),
  entry(WhatsappEvents.SEND_REQUESTED, 'application', 'whatsapp', 'Outbound WhatsApp send queued', 'whatsapp', 'WorkflowService', {}),
  entry(AssignmentEvents.SHORTLIST_UPDATED, 'domain', 'assignment', 'Shortlist membership changed', 'shortlist', 'AssignmentService', {
    status: 'planned',
  }),
  entry(AssignmentEvents.MATCH_SCORED, 'domain', 'assignment', 'AI match scores persisted', 'opportunity', 'AssignmentService', {
    status: 'planned',
  }),
  entry(TalentEvents.FREELANCER_CREATED, 'domain', 'talent', 'Freelancer profile created', 'freelancer', 'TalentService', {
    status: 'planned',
  }),
  entry(TalentEvents.FREELANCER_UPDATED, 'domain', 'talent', 'Freelancer profile updated', 'freelancer', 'TalentService', {
    status: 'planned',
  }),
  entry(KnowledgeEvents.ENTRY_CREATED, 'application', 'knowledge', 'Knowledge entry created', 'knowledge_entry', 'KnowledgeService', {
    idempotencyPattern: 'knowledge-entry:{entry_id}',
  }),
  entry(KnowledgeEvents.EMBEDDING_REQUESTED, 'application', 'knowledge', 'Embedding generation requested', 'knowledge_entry', 'KnowledgeService', {
    idempotencyPattern: 'knowledge-embedding:{entry_id}',
  }),
  entry(KnowledgeEvents.EMBEDDING_COMPLETED, 'application', 'knowledge', 'Embedding indexed', 'knowledge_entry', 'Embedding worker', {
    status: 'planned',
  }),
  entry(NotificationsEvents.NOTIFICATION_CREATED, 'application', 'notifications', 'In-app notification created', 'notification', 'NotificationService', {
    idempotencyPattern: 'notification:{user_id}:{type}:{ref}',
  }),
  entry(AgentEvents.SESSION_STARTED, 'application', 'agents', 'Agent session started', 'agent_session', 'AgentService', {
    status: 'planned',
  }),
  entry(AgentEvents.SESSION_COMPLETED, 'application', 'agents', 'Agent session completed', 'agent_session', 'AgentService', {
    status: 'planned',
  }),
  entry(MarketplaceEvents.PROFILE_PUBLISHED, 'domain', 'marketplace', 'Talent profile published to marketplace', 'freelancer', 'MarketplaceService', {
    status: 'planned',
  }),
  entry(IntegrationsEvents.WEBHOOK_RECEIVED, 'integration', 'integrations', 'Inbound webhook received', 'webhook', 'IntegrationService', {
    idempotencyPattern: '{source}:{idempotency_key}',
  }),
  entry('whatsapp.send_completed', 'integration', 'integrations', 'n8n WhatsApp send callback', 'whatsapp', 'IntegrationService', {}),
  entry('email.sent', 'integration', 'integrations', 'n8n email send callback', 'email', 'IntegrationService', {}),
  entry('ai.match_completed', 'integration', 'integrations', 'n8n AI match completion callback', 'ai_request', 'IntegrationService', {}),
] as const

export const EVENT_CATALOG_BY_TYPE = new Map(EVENT_CATALOG.map((e) => [e.type, e]))

export const DOMAIN_EVENTS = EVENT_CATALOG.filter((e) => e.category === 'domain')
export const APPLICATION_EVENTS = EVENT_CATALOG.filter((e) => e.category === 'application')
export const INTEGRATION_EVENTS = EVENT_CATALOG.filter((e) => e.category === 'integration')

export function findCatalogEntry(eventType: string): EventCatalogEntry | undefined {
  return EVENT_CATALOG_BY_TYPE.get(eventType) ?? (eventType.startsWith('payment.') ? {
    type: eventType,
    category: 'domain' as const,
    domain: 'finance',
    description: 'Payment status change (DB trigger)',
    aggregateType: 'payment',
    emitter: 'DB trigger',
    status: 'production' as const,
  } : undefined)
}

export function isKnownEventType(eventType: string): boolean {
  return findCatalogEntry(eventType) !== undefined
}
