import { createServices } from '@/lib/services/factory'

export async function getWhatsAppObservability(tenantId: string) {
  const services = await createServices()
  return services.whatsappPlatform.getObservabilitySummary(tenantId)
}

export async function listWhatsAppConversations(
  tenantId: string,
  options?: { page?: number; limit?: number }
) {
  const services = await createServices()
  return services.whatsappPlatform.listConversations(tenantId, options ?? {})
}

export async function getWhatsAppConversationDetail(
  tenantId: string,
  freelancerId: string,
  options?: { page?: number; limit?: number }
) {
  const services = await createServices()
  const [conversation, memory, audit] = await Promise.all([
    services.whatsappPlatform.getConversation(tenantId, freelancerId),
    services.whatsappPlatform.listMemory(tenantId, freelancerId, options ?? { limit: 50 }),
    services.whatsappPlatform.listAuditLogs(tenantId, { freelancerId, limit: 20 }),
  ])

  if (!conversation) return null

  return {
    conversation,
    memory: memory.data,
    audit: audit.data,
  }
}

export async function listWhatsAppApprovals(userId: string, tenantId: string) {
  const services = await createServices()
  return services.whatsappPlatform.listPendingApprovals(userId, tenantId)
}
