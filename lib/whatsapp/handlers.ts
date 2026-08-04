import type { Services } from '@/lib/services/factory'
import { entityIdFromIntent, responseForOpportunityIntent } from '@/lib/whatsapp/intents'
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
  const platform = services.whatsappPlatform

  switch (intent) {
    case 'opportunity.interested':
    case 'opportunity.declined':
      return handleOpportunityResponse(services, input)
    case 'milestone.submit':
      return handleMilestoneSubmit(services, input)
    case 'milestone.start':
      return handleMilestoneStart(services, input)
    case 'milestone.approve':
      return handleMilestoneApprove(platform, input)
    case 'milestone.revision':
      return handleMilestoneRevision(platform, input)
    case 'project.status':
      return handleProjectStatus(services, input)
    case 'project.approve':
      return handleProjectApprove(platform, services, input)
    case 'assignment.accept':
      return handleAssignmentAccept(platform, services, input)
    case 'assignment.reject':
      return handleAssignmentReject(platform, services, input)
    case 'deliverable.submit':
      return handleDeliverableSubmit(platform, services, input)
    case 'approval.approve':
    case 'approval.reject':
      return handleApprovalResolve(platform, services, input)
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

async function handleMilestoneApprove(
  platform: Services['whatsappPlatform'],
  input: {
    tenantId: string
    userId: string | null
    intent: DetectedIntent
    conversation: ConversationContext
  }
): Promise<WhatsAppHandlerResult> {
  if (!input.userId) {
    return { handled: false, intent: 'milestone.approve', reason: 'account_not_linked' }
  }

  const milestoneId = entityIdFromIntent(input.intent, input.conversation)
  if (!milestoneId) {
    return { handled: false, intent: 'milestone.approve', reason: 'no_active_milestone' }
  }

  const result = await platform.approveMilestone(input.tenantId, input.userId, milestoneId)
  if (!result.ok) {
    return { handled: false, intent: 'milestone.approve', reason: result.error }
  }

  return {
    handled: true,
    intent: 'milestone.approve',
    workflowEvent: 'milestone.approved',
    data: { milestone_id: milestoneId, project_id: result.projectId },
  }
}

async function handleMilestoneRevision(
  platform: Services['whatsappPlatform'],
  input: {
    tenantId: string
    userId: string | null
    intent: DetectedIntent
    conversation: ConversationContext
  }
): Promise<WhatsAppHandlerResult> {
  if (!input.userId) {
    return { handled: false, intent: 'milestone.revision', reason: 'account_not_linked' }
  }

  const milestoneId = entityIdFromIntent(input.intent, input.conversation)
  if (!milestoneId) {
    return { handled: false, intent: 'milestone.revision', reason: 'no_active_milestone' }
  }

  const note = input.intent.rawBody || 'Revision requested via WhatsApp'
  const result = await platform.requestRevision(input.tenantId, input.userId, milestoneId, note)
  if (!result.ok) {
    return { handled: false, intent: 'milestone.revision', reason: result.error }
  }

  return {
    handled: true,
    intent: 'milestone.revision',
    workflowEvent: 'milestone.revision_requested',
    data: { milestone_id: milestoneId, review_note: note },
  }
}

async function handleProjectApprove(
  platform: Services['whatsappPlatform'],
  services: Services,
  input: {
    tenantId: string
    freelancerId: string
    userId: string | null
    intent: DetectedIntent
    conversation: ConversationContext
  }
): Promise<WhatsAppHandlerResult> {
  if (!input.userId) {
    return { handled: false, intent: 'project.approve', reason: 'account_not_linked' }
  }

  const projectId = entityIdFromIntent(input.intent, input.conversation)
  if (!projectId) {
    return { handled: false, intent: 'project.approve', reason: 'no_active_project' }
  }

  const result = await platform.approveProject(input.tenantId, input.userId, projectId, 'active')
  if (!result.ok) {
    return { handled: false, intent: 'project.approve', reason: result.error }
  }

  await services.whatsapp.clearActiveEntity(input.tenantId, input.freelancerId)

  return {
    handled: true,
    intent: 'project.approve',
    workflowEvent: 'project.approved',
    data: { project_id: projectId, status: result.project.status },
  }
}

async function handleAssignmentAccept(
  platform: Services['whatsappPlatform'],
  services: Services,
  input: {
    tenantId: string
    freelancerId: string
    userId: string | null
    intent: DetectedIntent
    conversation: ConversationContext
  }
): Promise<WhatsAppHandlerResult> {
  if (!input.userId) {
    return { handled: false, intent: 'assignment.accept', reason: 'account_not_linked' }
  }

  let allocationId = entityIdFromIntent(input.intent, input.conversation)
  if (!allocationId) {
    const pending = await services.assignmentModule.listAllocations(input.tenantId, {
      freelancerId: input.freelancerId,
      status: 'planned',
      limit: 1,
    })
    allocationId = pending.data[0]?.id ?? null
  }

  if (!allocationId) {
    return { handled: false, intent: 'assignment.accept', reason: 'no_pending_assignment' }
  }

  const result = await platform.acceptAssignment(input.tenantId, input.userId, allocationId)
  if (!result.ok) {
    return { handled: false, intent: 'assignment.accept', reason: result.error }
  }

  await services.whatsapp.clearActiveEntity(input.tenantId, input.freelancerId)

  return {
    handled: true,
    intent: 'assignment.accept',
    workflowEvent: 'assignment.accepted',
    data: { allocation_id: allocationId, status: result.allocation.status },
  }
}

async function handleAssignmentReject(
  platform: Services['whatsappPlatform'],
  services: Services,
  input: {
    tenantId: string
    freelancerId: string
    userId: string | null
    intent: DetectedIntent
    conversation: ConversationContext
  }
): Promise<WhatsAppHandlerResult> {
  if (!input.userId) {
    return { handled: false, intent: 'assignment.reject', reason: 'account_not_linked' }
  }

  let allocationId = entityIdFromIntent(input.intent, input.conversation)
  if (!allocationId) {
    const pending = await services.assignmentModule.listAllocations(input.tenantId, {
      freelancerId: input.freelancerId,
      status: 'planned',
      limit: 1,
    })
    allocationId = pending.data[0]?.id ?? null
  }

  if (!allocationId) {
    return { handled: false, intent: 'assignment.reject', reason: 'no_pending_assignment' }
  }

  const result = await platform.rejectAssignment(input.tenantId, input.userId, allocationId)
  if (!result.ok) {
    return { handled: false, intent: 'assignment.reject', reason: result.error }
  }

  await services.whatsapp.clearActiveEntity(input.tenantId, input.freelancerId)

  return {
    handled: true,
    intent: 'assignment.reject',
    workflowEvent: 'assignment.rejected',
    data: { allocation_id: allocationId },
  }
}

async function handleDeliverableSubmit(
  platform: Services['whatsappPlatform'],
  services: Services,
  input: {
    tenantId: string
    freelancerId: string
    userId: string | null
    intent: DetectedIntent
    conversation: ConversationContext
  }
): Promise<WhatsAppHandlerResult> {
  if (!input.userId) {
    return { handled: false, intent: 'deliverable.submit', reason: 'account_not_linked' }
  }

  let projectId =
    input.conversation.activeEntityType === 'project'
      ? input.conversation.activeEntityId
      : null

  if (!projectId) {
    const projects = await services.project.getFreelancerProjectSummary(
      input.freelancerId,
      input.tenantId
    )
    projectId = projects[0]?.id ?? null
  }

  if (!projectId) {
    return { handled: false, intent: 'deliverable.submit', reason: 'no_active_project' }
  }

  const title = input.intent.rawBody?.slice(0, 120) || 'Deliverable via WhatsApp'
  const result = await platform.sendDeliverable(input.tenantId, input.userId, projectId, { title })
  if (!result.ok) {
    return { handled: false, intent: 'deliverable.submit', reason: result.error }
  }

  return {
    handled: true,
    intent: 'deliverable.submit',
    workflowEvent: 'deliverable.submitted',
    data: { project_id: projectId, deliverable_id: result.deliverable.id },
  }
}

async function handleApprovalResolve(
  platform: Services['whatsappPlatform'],
  services: Services,
  input: {
    tenantId: string
    freelancerId: string
    userId: string | null
    intent: DetectedIntent
    conversation: ConversationContext
  }
): Promise<WhatsAppHandlerResult> {
  if (!input.userId) {
    return { handled: false, intent: input.intent.intent, reason: 'account_not_linked' }
  }

  let approvalId = entityIdFromIntent(input.intent, input.conversation)
  if (!approvalId) {
    const gate = await services.whatsappPlatform.listPendingApprovals(input.userId, input.tenantId)
    approvalId = gate.whatsappGates.find((g) => g.freelancerId === input.freelancerId)?.approvalRequestId ?? null
  }

  if (!approvalId) {
    return { handled: false, intent: input.intent.intent, reason: 'no_pending_approval' }
  }

  const decision = input.intent.intent === 'approval.approve' ? 'approved' : 'rejected'
  const result = await platform.resolveApproval(
    input.tenantId,
    input.userId,
    approvalId,
    decision,
    input.intent.rawBody
  )

  if (!result.ok) {
    return { handled: false, intent: input.intent.intent, reason: result.error ?? 'approval_failed' }
  }

  await services.whatsapp.clearActiveEntity(input.tenantId, input.freelancerId)

  return {
    handled: true,
    intent: input.intent.intent,
    workflowEvent: 'approval.resolved',
    data: { approval_id: approvalId, decision },
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

function handleHelp(input: { intent: DetectedIntent }): WhatsAppHandlerResult {
  return {
    handled: true,
    intent: 'help',
    data: {
      menu: [
        'Reply YES/NO to opportunity invites',
        'Reply ACCEPT/REJECT ASSIGNMENT for allocations',
        'Reply START to begin a milestone',
        'Reply SUBMIT when work is ready',
        'Reply DELIVER to send deliverables',
        'Reply APPROVE/REVISION for milestone review (managers)',
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
    await services.whatsappPlatform.recordAssistantMemory(
      input.tenantId,
      input.freelancerId,
      String(agentResult.data.response ?? ''),
      'agent.query'
    )

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
