import type { Services } from '@/lib/services/factory'
import { responseForOpportunityIntent } from '@/lib/whatsapp/intents'
import type {
  ConversationContext,
  DetectedIntent,
  WhatsAppHandlerResult,
} from '@/lib/whatsapp/types'

export async function handleWhatsAppIntent(
  services: Services,
  input: {
    tenantId: string
    freelancerId: string
    freelancerName: string
    userId: string | null
    intent: DetectedIntent
    conversation: ConversationContext
    waMessageId: string
  }
): Promise<WhatsAppHandlerResult> {
  const { intent } = input.intent

  switch (intent) {
    case 'opportunity.interested':
    case 'opportunity.declined':
      return handleOpportunityResponse(services, input)
    case 'milestone.submit':
      return handleMilestoneSubmit(services, input)
    case 'milestone.start':
      return handleMilestoneStart(services, input)
    case 'project.status':
      return handleProjectStatus(services, input)
    case 'opt_out':
      return handleOptOut(services, input)
    case 'help':
      return handleHelp(input)
    case 'agent.query':
      return handleAgentQuery(services, input)
    default:
      return { handled: false, intent: 'unknown', reason: 'unrecognized_message' }
  }
}

async function handleOpportunityResponse(
  services: Services,
  input: {
    tenantId: string
    freelancerId: string
    userId: string | null
    intent: DetectedIntent
    waMessageId: string
  }
): Promise<WhatsAppHandlerResult> {
  const response = responseForOpportunityIntent(input.intent.intent)
  if (!response) {
    return { handled: false, intent: input.intent.intent, reason: 'invalid_response' }
  }

  const result = await services.crm.respondToPendingOpportunity(
    input.tenantId,
    input.userId,
    input.freelancerId,
    response,
    `Via WhatsApp: ${input.intent.rawBody}`
  )

  if (!result.ok) {
    return { handled: false, intent: input.intent.intent, reason: result.error }
  }

  await services.whatsapp.clearActiveEntity(input.tenantId, input.freelancerId)

  return {
    handled: true,
    intent: input.intent.intent,
    workflowEvent: 'opportunity.response',
    data: {
      response,
      opportunity_id: result.opportunityId,
      recipient_id: result.recipientId,
    },
  }
}

async function handleMilestoneSubmit(
  services: Services,
  input: {
    tenantId: string
    freelancerId: string
    userId: string | null
    intent: DetectedIntent
  }
): Promise<WhatsAppHandlerResult> {
  if (!input.userId) {
    return { handled: false, intent: 'milestone.submit', reason: 'account_not_linked' }
  }

  const milestone = await services.workflow.findSubmittableMilestone(
    input.freelancerId,
    input.tenantId
  )
  if (!milestone) {
    return { handled: false, intent: 'milestone.submit', reason: 'no_submittable_milestone' }
  }

  const result = await services.workflow.submitMilestone(
    milestone.id,
    input.tenantId,
    input.userId,
    input.intent.rawBody || 'Submitted via WhatsApp'
  )

  if (!result.ok) {
    return { handled: false, intent: 'milestone.submit', reason: result.error }
  }

  return {
    handled: true,
    intent: 'milestone.submit',
    workflowEvent: 'milestone.submitted',
    data: {
      milestone_id: milestone.id,
      project_id: result.projectId,
      project_title: milestone.project_title,
    },
  }
}

async function handleMilestoneStart(
  services: Services,
  input: {
    tenantId: string
    freelancerId: string
    userId: string | null
    intent: DetectedIntent
  }
): Promise<WhatsAppHandlerResult> {
  if (!input.userId) {
    return { handled: false, intent: 'milestone.start', reason: 'account_not_linked' }
  }

  const milestone = await services.workflow.findSubmittableMilestone(
    input.freelancerId,
    input.tenantId
  )
  if (!milestone || milestone.status !== 'pending') {
    return { handled: false, intent: 'milestone.start', reason: 'no_pending_milestone' }
  }

  const result = await services.workflow.updateMilestoneStatus(
    milestone.id,
    input.tenantId,
    'in_progress',
    input.userId,
    false
  )

  if (!result.ok) {
    return { handled: false, intent: 'milestone.start', reason: result.error }
  }

  return {
    handled: true,
    intent: 'milestone.start',
    data: {
      milestone_id: milestone.id,
      project_id: result.projectId,
    },
  }
}

async function handleProjectStatus(
  services: Services,
  input: {
    tenantId: string
    freelancerId: string
    intent: DetectedIntent
  }
): Promise<WhatsAppHandlerResult> {
  const summary = await services.project.getFreelancerProjectSummary(
    input.freelancerId,
    input.tenantId
  )

  if (!summary.length) {
    return { handled: false, intent: 'project.status', reason: 'no_active_projects' }
  }

  return {
    handled: true,
    intent: 'project.status',
    data: { projects: summary },
  }
}

async function handleOptOut(
  services: Services,
  input: { tenantId: string; freelancerId: string; userId: string | null }
): Promise<WhatsAppHandlerResult> {
  await services.workflow.emitEvent({
    tenantId: input.tenantId,
    eventType: 'whatsapp.opt_out',
    aggregateType: 'freelancer',
    aggregateId: input.freelancerId,
    idempotencyKey: `whatsapp-opt-out:${input.freelancerId}`,
    actorId: input.userId,
    payload: { freelancer_id: input.freelancerId, channel: 'whatsapp' },
  })

  await services.whatsapp.clearActiveEntity(input.tenantId, input.freelancerId)

  return {
    handled: true,
    intent: 'opt_out',
    workflowEvent: 'whatsapp.opt_out',
    data: { opted_out: true },
  }
}

function handleHelp(input: {
  intent: DetectedIntent
}): WhatsAppHandlerResult {
  return {
    handled: true,
    intent: 'help',
    data: {
      menu: [
        'Reply YES/NO to opportunity invites',
        'Reply START to begin a milestone',
        'Reply SUBMIT when work is ready',
        'Reply STATUS for project updates',
        'Reply STOP to opt out',
      ],
      raw: input.intent.rawBody,
    },
  }
}

async function handleAgentQuery(
  services: Services,
  input: {
    tenantId: string
    freelancerId: string
    freelancerName: string
    userId: string | null
    intent: DetectedIntent
    conversation: ConversationContext
  }
): Promise<WhatsAppHandlerResult> {
  const agentResult = await services.whatsapp.runAgentQuery({
    tenantId: input.tenantId,
    freelancerId: input.freelancerId,
    freelancerName: input.freelancerName,
    query: input.intent.rawBody,
    conversation: input.conversation,
  })

  if (agentResult.ok) {
    return {
      handled: true,
      intent: 'agent.query',
      workflowEvent: 'whatsapp.agent_response',
      data: agentResult.data,
    }
  }

  await services.workflow.emitEvent({
    tenantId: input.tenantId,
    eventType: 'whatsapp.unrecognized',
    aggregateType: 'freelancer',
    aggregateId: input.freelancerId,
    idempotencyKey: `whatsapp-unrecognized:${input.freelancerId}:${Date.now()}`,
    actorId: input.userId,
    payload: {
      freelancer_id: input.freelancerId,
      body: input.intent.rawBody,
      reason: agentResult.error ?? 'agent_unavailable',
    },
  })

  return {
    handled: false,
    intent: 'agent.query',
    reason: agentResult.error ?? 'agent_unavailable',
  }
}
