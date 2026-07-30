import { createServices } from '@/lib/services/factory'
export type { TalentRow } from '@/lib/services/talent.service'

export async function getTalentName(freelancerId: string) {
  const services = await createServices()
  return services.talent.getTalentName(freelancerId)
}

export async function getTalentProfile(freelancerId: string, tenantId: string) {
  const services = await createServices()
  return services.talent.getTalentProfile(freelancerId, tenantId)
}

export async function getTalentActivity(freelancerId: string, limit = 10) {
  const services = await createServices()
  return services.talent.getTalentActivity(freelancerId, limit)
}

export async function searchTalentRoster(
  tenantId: string,
  params: {
    query?: string
    discipline?: string
    availability?: string
    minRate?: number
    maxRate?: number
    minRating?: number
    sort?: string
    limit?: number
    offset?: number
  }
) {
  const services = await createServices()
  return services.talent.searchRosterQuery(tenantId, params)
}

export async function getPortfolioItems(freelancerId: string) {
  const services = await createServices()
  return services.portfolio.getItems(freelancerId)
}

export async function getRatingHistory(freelancerId: string) {
  const services = await createServices()
  return services.talent.getRatingHistory(freelancerId)
}
