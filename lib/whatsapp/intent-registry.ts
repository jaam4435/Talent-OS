import type { Services } from '@/lib/services/factory'
import type { IntentHandlerContext, WhatsAppHandlerResult, WhatsAppIntent } from '@/lib/whatsapp/types'
import {
  handleAgentQuery,
  handleApprovalApprove,
  handleApprovalList,
  handleApprovalReject,
  handleAvailabilityUpdate,
  handleHelp,
  handleMilestoneReview,
  handleMilestoneStart,
  handleMilestoneSubmit,
  handleNotificationList,
  handleOpportunityList,
  handleOpportunityResponse,
  handleOptOut,
  handlePaymentStatus,
  handleProjectAccept,
  handleProjectStatus,
} from '@/lib/whatsapp/handlers'

export interface IntentDefinition {
  intent: WhatsAppIntent
  /** Domain service method invoked — documentation / parity enforcement. */
  service: string
  handler: (services: Services, ctx: IntentHandlerContext) => Promise<WhatsAppHandlerResult>
}

/** Declarative intent → handler registry. All handlers delegate to existing services. */
export const INTENT_REGISTRY: IntentDefinition[] = [
  { intent: 'opportunity.interested', service: 'CRMService.respondToPendingOpportunity', handler: handleOpportunityResponse },
  { intent: 'opportunity.declined', service: 'CRMService.respondToPendingOpportunity', handler: handleOpportunityResponse },
  { intent: 'opportunity.list', service: 'CRMService.listPendingInvitesForFreelancer', handler: handleOpportunityList },
  { intent: 'milestone.submit', service: 'WorkflowService.submitMilestone', handler: handleMilestoneSubmit },
  { intent: 'milestone.start', service: 'WorkflowService.updateMilestoneStatus', handler: handleMilestoneStart },
  { intent: 'milestone.review_approve', service: 'WorkflowService.reviewMilestone', handler: handleMilestoneReview },
  { intent: 'milestone.review_revision', service: 'WorkflowService.reviewMilestone', handler: handleMilestoneReview },
  { intent: 'project.status', service: 'ProjectService.getFreelancerProjectSummary', handler: handleProjectStatus },
  { intent: 'project.accept', service: 'ProjectService.updateProjectStatus', handler: handleProjectAccept },
  { intent: 'availability.available', service: 'TalentService.updateOwnProfile', handler: handleAvailabilityUpdate },
  { intent: 'availability.busy', service: 'TalentService.updateOwnProfile', handler: handleAvailabilityUpdate },
  { intent: 'availability.unavailable', service: 'TalentService.updateOwnProfile', handler: handleAvailabilityUpdate },
  { intent: 'payment.status', service: 'FinanceService.getPaymentsForPage', handler: handlePaymentStatus },
  { intent: 'notification.list', service: 'NotificationService.listByUser', handler: handleNotificationList },
  { intent: 'approval.list', service: 'WorkflowEngineService.listPendingApprovals', handler: handleApprovalList },
  { intent: 'approval.approve', service: 'WorkflowEngineService.resolveApproval', handler: handleApprovalApprove },
  { intent: 'approval.reject', service: 'WorkflowEngineService.resolveApproval', handler: handleApprovalReject },
  { intent: 'approval.resolve', service: 'WorkflowEngineService.resolveApproval', handler: handleApprovalApprove },
  { intent: 'opt_out', service: 'WorkflowService.emitEvent', handler: handleOptOut },
  { intent: 'help', service: 'static', handler: async (_s, ctx) => handleHelp({ intent: ctx.intent }) },
  { intent: 'agent.query', service: 'WhatsAppService.runAgentQuery', handler: handleAgentQuery },
]

const REGISTRY_MAP = new Map(INTENT_REGISTRY.map((d) => [d.intent, d]))

export function getIntentDefinition(intent: WhatsAppIntent): IntentDefinition | undefined {
  return REGISTRY_MAP.get(intent)
}

export async function routeIntent(
  services: Services,
  ctx: IntentHandlerContext
): Promise<WhatsAppHandlerResult> {
  const definition = getIntentDefinition(ctx.intent.intent)
  if (!definition) {
    return { handled: false, intent: ctx.intent.intent, reason: 'unrecognized_message' }
  }
  return definition.handler(services, ctx)
}
