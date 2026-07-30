/** Stable idempotency key builders — unique per (tenant, key). */

export const IdempotencyKeys = {
  entityAction: (action: string, entityId: string) => `${action}:${entityId}`,
  whatsappMessage: (waMessageId: string) => `whatsapp-inbound:${waMessageId}`,
  whatsappIntent: (waMessageId: string, intent: string) => `whatsapp-intent:${waMessageId}:${intent}`,
  milestoneSubmitted: (milestoneId: string) => `milestone-submitted:${milestoneId}`,
  milestoneApproved: (milestoneId: string) => `milestone-approved:${milestoneId}`,
  milestoneRevision: (milestoneId: string) => `milestone-revision:${milestoneId}`,
  milestoneOverdue: (milestoneId: string, dueDate: string) => `milestone-overdue:${milestoneId}:${dueDate}`,
  paymentApproved: (paymentId: string) => `payment-approved:${paymentId}`,
  paymentPaid: (paymentId: string) => `payment-paid:${paymentId}`,
  paymentDisputed: (paymentId: string) => `payment-disputed:${paymentId}`,
  aiMatch: (opportunityId: string, requestId: string) => `ai-match:${opportunityId}:${requestId}`,
  aiBriefParse: (opportunityId: string, requestId: string) => `ai-brief-parse:${opportunityId}:${requestId}`,
  aiSummary: (entityType: string, entityId: string, requestId: string) =>
    `ai-summary:${entityType}:${entityId}:${requestId}`,
  aiStatus: (projectId: string, requestId: string) => `ai-status:${projectId}:${requestId}`,
  projectAssigned: (projectId: string) => `project-assigned:${projectId}`,
  opportunityResponse: (opportunityId: string, freelancerId: string) =>
    `opportunity-response:${opportunityId}:${freelancerId}`,
  opportunityBroadcast: (opportunityId: string) => `opportunity-broadcast:${opportunityId}`,
  knowledgeEntry: (entryId: string) => `knowledge-entry:${entryId}`,
  knowledgeEmbedding: (entryId: string) => `knowledge-embedding:${entryId}`,
  notification: (userId: string, type: string, ref: string) => `notification:${userId}:${type}:${ref}`,
  webhook: (source: string, key: string) => `${source}:${key}`,
} as const
