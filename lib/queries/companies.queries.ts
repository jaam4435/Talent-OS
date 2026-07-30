import { createServices } from '@/lib/services/factory'
import type { ShortlistItemView } from '@/lib/shortlists/types'

export async function listCompanies(tenantId: string) {
  const services = await createServices()
  return services.crm.listCompanies(tenantId)
}

export async function getCompanyById(companyId: string, tenantId: string) {
  const services = await createServices()
  return services.crm.getCompanyById(companyId, tenantId)
}

export async function getShortlistItems(
  opportunityId: string,
  tenantId: string
): Promise<{ shortlistId: string | null; items: ShortlistItemView[] }> {
  const services = await createServices()
  return services.assignment.getShortlistItems(opportunityId, tenantId)
}

export async function getOrCreateShortlist(
  opportunityId: string,
  tenantId: string,
  createdBy: string
): Promise<string> {
  const services = await createServices()
  return services.assignment.getOrCreateShortlist(opportunityId, tenantId, createdBy)
}
