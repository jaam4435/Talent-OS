/**
 * Web UI action → WhatsApp intent parity manifest.
 * Every row delegates to the same service method as the web action — no duplicate logic.
 */
export const WHATSAPP_WEB_PARITY = [
  {
    webAction: 'respondToOpportunity',
    webPath: 'app/actions/opportunities.ts',
    whatsappIntents: ['opportunity.interested', 'opportunity.declined'],
    service: 'CRMService.respondToOpportunity / respondToPendingOpportunity',
    keywords: 'YES / NO',
  },
  {
    webAction: 'submitMilestone',
    webPath: 'app/actions/milestones.ts',
    whatsappIntents: ['milestone.submit'],
    service: 'WorkflowService.submitMilestone',
    keywords: 'SUBMIT / DONE',
  },
  {
    webAction: 'updateMilestoneStatus',
    webPath: 'app/actions/milestones.ts',
    whatsappIntents: ['milestone.start'],
    service: 'WorkflowService.updateMilestoneStatus',
    keywords: 'START',
  },
  {
    webAction: 'updateProjectStatusAsFreelancer',
    webPath: 'app/actions/projects.ts',
    whatsappIntents: ['project.accept'],
    service: 'ProjectService.updateProjectStatus',
    keywords: 'ACCEPT',
  },
  {
    webAction: 'updateOwnFreelancerProfile',
    webPath: 'app/actions/freelancers.ts',
    whatsappIntents: ['availability.available', 'availability.busy', 'availability.unavailable'],
    service: 'TalentService.updateOwnProfile',
    keywords: 'AVAILABLE / BUSY / UNAVAILABLE',
  },
  {
    webAction: 'resolveApproval',
    webPath: 'app/actions/approvals.ts',
    whatsappIntents: ['approval.approve', 'approval.reject'],
    service: 'WorkflowEngineService.resolveApproval',
    keywords: 'APPROVE / REJECT (when approval pinned)',
  },
  {
    webAction: 'listPendingApprovals',
    webPath: 'app/actions/approvals.ts',
    whatsappIntents: ['approval.list'],
    service: 'WorkflowEngineService.listPendingApprovals',
    keywords: 'APPROVALS',
  },
  {
    webAction: 'getFreelancerProjectSummary',
    webPath: 'lib/services/project.service.ts',
    whatsappIntents: ['project.status'],
    service: 'ProjectService.getFreelancerProjectSummary',
    keywords: 'STATUS',
  },
  {
    webAction: 'getPaymentsForPage',
    webPath: 'lib/services/finance.service.ts',
    whatsappIntents: ['payment.status'],
    service: 'FinanceService.getPaymentsForPage',
    keywords: 'PAYMENTS',
  },
  {
    webAction: 'listByUser',
    webPath: 'lib/services/notification.service.ts',
    whatsappIntents: ['notification.list'],
    service: 'NotificationService.listByUser',
    keywords: 'NOTIFICATIONS / ALERTS',
  },
  {
    webAction: 'listPendingInvites',
    webPath: 'lib/services/crm.service.ts',
    whatsappIntents: ['opportunity.list'],
    service: 'CRMService.listPendingInvitesForFreelancer',
    keywords: 'OPPORTUNITIES',
  },
  {
    webAction: 'reviewMilestone',
    webPath: 'app/actions/milestones.ts',
    whatsappIntents: ['milestone.review_approve', 'milestone.review_revision'],
    service: 'WorkflowService.reviewMilestone',
    keywords: 'APPROVE MILESTONE / REVISE (manager, pinned milestone)',
  },
] as const

export type WhatsAppParityEntry = (typeof WHATSAPP_WEB_PARITY)[number]
