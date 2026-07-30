import { createServices } from '@/lib/services/factory'

export async function getTeamMembersPageData(tenantId: string) {
  const services = await createServices()
  return services.analytics.getTeamMembersPageData(tenantId)
}
