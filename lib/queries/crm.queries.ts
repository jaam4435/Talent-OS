import { createServices } from '@/lib/services/factory'

export async function getCrmPipelineBoard(tenantId: string) {
  const services = await createServices()
  return services.crmDemand.getPipelineBoard(tenantId)
}

export async function listCrmLeads(
  tenantId: string,
  options?: { page?: number; limit?: number; q?: string; status?: string; company_id?: string }
) {
  const services = await createServices()
  return services.crmDemand.listLeads(tenantId, options ?? {})
}

export async function getCrmLead(tenantId: string, id: string) {
  const services = await createServices()
  return services.crmDemand.getLead(tenantId, id)
}

export async function listCrmCompanies(
  tenantId: string,
  options?: { page?: number; limit?: number; q?: string; status?: string }
) {
  const services = await createServices()
  return services.crmDemand.listCompanies(tenantId, options ?? {})
}

export async function getCrmCompany(tenantId: string, id: string) {
  const services = await createServices()
  return services.crmDemand.getCompany(tenantId, id)
}

export async function getCrmCompanyDetail(tenantId: string, id: string) {
  const services = await createServices()
  const [company, contacts, deals] = await Promise.all([
    services.crmDemand.getCompany(tenantId, id),
    services.crmDemand.listContacts(tenantId, { company_id: id, limit: 50 }),
    services.crmDemand.listDeals(tenantId, { company_id: id, limit: 50 }),
  ])

  if (!company) return null

  const linkedOpportunityIds = [
    ...new Set(deals.data.map((deal) => deal.opportunityId).filter(Boolean)),
  ] as string[]

  return {
    company,
    contacts: contacts.data,
    deals: deals.data,
    linkedOpportunityIds,
  }
}

export async function getCrmDeal(tenantId: string, id: string) {
  const services = await createServices()
  return services.crmDemand.getDeal(tenantId, id)
}

export async function listCrmDeals(
  tenantId: string,
  options?: { page?: number; limit?: number; q?: string; stage_id?: string; company_id?: string }
) {
  const services = await createServices()
  return services.crmDemand.listDeals(tenantId, options ?? {})
}

export async function listCrmContracts(
  tenantId: string,
  options?: { page?: number; limit?: number; status?: string; company_id?: string }
) {
  const services = await createServices()
  return services.crmDemand.listContracts(tenantId, options ?? {})
}

export async function listCrmActivities(
  tenantId: string,
  entityType: string,
  entityId: string,
  options?: { page?: number; limit?: number }
) {
  const services = await createServices()
  return services.crmDemand.listActivities(tenantId, entityType, entityId, options ?? {})
}
