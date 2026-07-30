import { createTalentServices } from '@/lib/domains/talent/factory'
import type { PortfolioItem, RatingHistoryEntry } from '@/lib/domains/talent/types'

export async function getPortfolioItems(freelancerId: string): Promise<PortfolioItem[]> {
  const { portfolio } = await createTalentServices()
  return portfolio.getItems(freelancerId)
}

export async function getRatingHistory(freelancerId: string): Promise<RatingHistoryEntry[]> {
  const { queries } = await createTalentServices()
  return queries.getRatingHistory(freelancerId)
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
  const { queries } = await createTalentServices()
  return queries.searchRoster(tenantId, params)
}
