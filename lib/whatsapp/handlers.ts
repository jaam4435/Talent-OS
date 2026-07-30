import type { Services } from '@/lib/services/factory'
import { availabilityForIntent, responseForOpportunityIntent } from '@/lib/whatsapp/intents'
import type { IntentHandlerContext, WhatsAppHandlerResult } from '@/lib/whatsapp/types'

export async function handleWhatsAppIntent(
  services: Services,
  input: IntentHandlerContext
): Promise<WhatsAppHandlerResult> {
  const { routeIntent } = await import('@/lib/whatsapp/intent-registry')
  return routeIntent(services, input)
}

export async function handleOpportunityResponse(
  services: Services,
  input: IntentHandlerContext
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

export async function handleOpportunityList(
  services: Services,
  input: IntentHandlerContext
): Promise<WhatsAppHandlerResult> {
  const invites = await services.crm.listPendingInvitesForFreelancer(
    input.tenantId,
    input.freelancerId
  )

  return {
    handled: true,
    intent: 'opportunity.list',
    data: { opportunities: invites },
  }
}

export async function handleMilestoneSubmit(
  services: Services,
  input: IntentHandlerContext
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

export async function handleMilestoneStart(
  services: Services,
  input: IntentHandlerContext
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

export async function handleMilestoneReview(
  services: Services,
  input: IntentHandlerContext
): Promise<WhatsAppHandlerResult> {
  if (!input.userId) {
    return { handled: false, intent: input.intent.intent, reason: 'account_not_linked' }
  }

  const milestoneId = input.conversation.activeEntityId
  if (!milestoneId || input.conversation.activeEntityType !== 'milestone') {
    return { handled: false, intent: input.intent.intent, reason: 'no_milestone_pinned' }
  }

  const action = input.intent.intent === 'milestone.review_approve' ? 'approve' : 'revision'
  const result = await services.workflow.reviewMilestone(
    milestoneId,
    input.tenantId,
    input.userId,
    action,
    input.intent.rawBody || `Via WhatsApp: ${action}`
  )

  if (!result.ok) {
    return { handled: false, intent: input.intent.intent, reason: result.error }
  }

  await services.whatsapp.clearActiveEntity(input.tenantId, input.freelancerId)

  return {
    handled: true,
    intent: input.intent.intent,
    workflowEvent: action === 'approve' ? 'milestone.approved' : 'milestone.revision_requested',
    data: { milestone_id: milestoneId, project_id: result.projectId, action },
  }
}

export async function handleProjectStatus(
  services: Services,
  input: IntentHandlerContext
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

export async function handleProjectAccept(
  services: Services,
  input: IntentHandlerContext
): Promise<WhatsAppHandlerResult> {
  if (!input.userId) {
    return { handled: false, intent: 'project.accept', reason: 'account_not_linked' }
  }

  const projects = await services.project.getFreelancerProjectSummary(
    input.freelancerId,
    input.tenantId
  )
  const pending = projects.find((p) => p.status === 'pending' || p.status === 'draft')
  if (!pending) {
    return { handled: false, intent: 'project.accept', reason: 'no_pending_project' }
  }

  const result = await services.project.updateProjectStatus(
    pending.id,
    input.tenantId,
    'active',
    'freelancer',
    input.userId
  )

  if (!result.ok) {
    return { handled: false, intent: 'project.accept', reason: result.error }
  }

  return {
    handled: true,
    intent: 'project.accept',
    workflowEvent: 'project.assigned',
    data: { project_id: pending.id, title: pending.title },
  }
}

export async function handleAvailabilityUpdate(
  services: Services,
  input: IntentHandlerContext
): Promise<WhatsAppHandlerResult> {
  if (!input.userId) {
    return { handled: false, intent: input.intent.intent, reason: 'account_not_linked' }
  }

  const availability = availabilityForIntent(input.intent.intent)
  if (!availability) {
    return { handled: false, intent: input.intent.intent, reason: 'invalid_availability' }
  }

  const result = await services.talent.updateAvailability(
    input.userId,
    input.tenantId,
    availability
  )

  if (!result.ok) {
    return { handled: false, intent: input.intent.intent, reason: result.error ?? 'update_failed' }
  }

  return {
    handled: true,
    intent: input.intent.intent,
    data: { availability, freelancer_id: result.freelancerId },
  }
}

export async function handlePaymentStatus(
  services: Services,
  input: IntentHandlerContext
): Promise<WhatsAppHandlerResult> {
  if (!input.userId) {
    return { handled: false, intent: 'payment.status', reason: 'account_not_linked' }
  }

  const { payments } = await services.finance.getPaymentsForPage(
    input.tenantId,
    'freelancer',
    input.userId
  )

  return {
    handled: true,
    intent: 'payment.status',
    data: {
      payments: payments.slice(0, 5).map((p) => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        currency: p.currency,
      })),
    },
  }
}

export async function handleNotificationList(
  services: Services,
  input: IntentHandlerContext
): Promise<WhatsAppHandlerResult> {
  if (!input.userId) {
    return { handled: false, intent: 'notification.list', reason: 'account_not_linked' }
  }

  const notifications = await services.notification.listByUser(
    input.userId,
    input.tenantId,
    true
  )

  return {
    handled: true,
    intent: 'notification.list',
    data: {
      notifications: notifications.slice(0, 10).map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        created_at: n.created_at,
      })),
    },
  }
}

export async function handleApprovalList(
  services: Services,
  input: IntentHandlerContext
): Promise<WhatsAppHandlerResult> {
  if (!input.userId) {
    return { handled: false, intent: 'approval.list', reason: 'account_not_linked' }
  }

  const approvals = await services.workflowEngine.listPendingApprovals(
    input.userId,
    input.tenantId
  )

  if (approvals.length > 0) {
    const first = approvals[0]
    await services.whatsapp.pinApproval(
      input.tenantId,
      input.freelancerId,
      input.conversation,
      first.id as string
    )
  }

  return {
    handled: true,
    intent: 'approval.list',
    data: {
      approvals: approvals.slice(0, 5).map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        status: a.status,
      })),
      pinned_approval_id: approvals[0]?.id ?? null,
    },
  }
}

export async function handleApprovalApprove(
  services: Services,
  input: IntentHandlerContext
): Promise<WhatsAppHandlerResult> {
  return resolveApproval(services, input, 'approved')
}

export async function handleApprovalReject(
  services: Services,
  input: IntentHandlerContext
): Promise<WhatsAppHandlerResult> {
  return resolveApproval(services, input, 'rejected')
}

async function resolveApproval(
  services: Services,
  input: IntentHandlerContext,
  decision: 'approved' | 'rejected'
): Promise<WhatsAppHandlerResult> {
  if (!input.userId) {
    return { handled: false, intent: input.intent.intent, reason: 'account_not_linked' }
  }

  const approvalId =
    input.conversation.activeEntityType === 'approval_request'
      ? input.conversation.activeEntityId
      : null

  if (!approvalId) {
    return { handled: false, intent: input.intent.intent, reason: 'no_approval_pinned' }
  }

  const result = await services.workflowEngine.resolveApproval(
    approvalId,
    input.userId,
    decision,
    input.intent.rawBody || `Via WhatsApp: ${decision}`
  )

  if (!result.ok) {
    return { handled: false, intent: input.intent.intent, reason: result.error }
  }

  await services.whatsapp.clearActiveEntity(input.tenantId, input.freelancerId)

  return {
    handled: true,
    intent: input.intent.intent,
    workflowEvent: decision === 'approved' ? 'approval.approved' : 'approval.rejected',
    data: { approval_id: approvalId, decision },
  }
}

export async function handleOptOut(
  services: Services,
  input: IntentHandlerContext
): Promise<WhatsAppHandlerResult> {
  if (input.userId) {
    await services.talent.updateAvailability(input.userId, input.tenantId, 'unavailable')
  }

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

export function handleHelp(input: { intent: IntentHandlerContext['intent'] }): WhatsAppHandlerResult {
  return {
    handled: true,
    intent: 'help',
    data: {
      menu: [
        'YES/NO — respond to opportunity invites',
        'OPPORTUNITIES — list pending invites',
        'START — begin a milestone',
        'SUBMIT — submit milestone for review',
        'STATUS — active projects',
        'ACCEPT — accept assigned project',
        'PAYMENTS — payment status',
        'NOTIFICATIONS — unread alerts',
        'APPROVALS — pending approvals (managers)',
        'APPROVE/REJECT — when approval is pinned',
        'AVAILABLE/BUSY/UNAVAILABLE — update availability',
        'HELP — show this menu',
        'STOP — opt out',
      ],
      raw: input.intent.rawBody,
    },
  }
}

export async function handleAgentQuery(
  services: Services,
  input: IntentHandlerContext
): Promise<WhatsAppHandlerResult> {
  const agentResult = await services.whatsapp.runAgentQuery({
    tenantId: input.tenantId,
    freelancerId: input.freelancerId,
    freelancerName: input.freelancerName,
    userId: input.userId,
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
