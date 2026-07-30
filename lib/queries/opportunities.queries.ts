import { createServices } from '@/lib/services/factory'

export async function getOpportunitiesForPage(tenantId: string) {
  const services = await createServices()
  return services.crm.getOpportunitiesForPage(tenantId)
}

export async function getOpportunityDetail(opportunityId: string, tenantId: string) {
  const services = await createServices()
  return services.crm.getOpportunityDetail(opportunityId, tenantId)
}

export async function getOpportunityPageData(
  opportunityId: string,
  tenantId: string,
  userId: string,
  isManager: boolean
) {
  const services = await createServices()
  return services.crm.getOpportunityPageData(opportunityId, tenantId, userId, isManager)
}

export async function getShortlistPageHeader(opportunityId: string, tenantId: string) {
  const services = await createServices()
  return services.crm.getShortlistPageHeader(opportunityId, tenantId)
}
