import { createServices } from '@/lib/services/factory'
import type { PortfolioItem, RatingHistoryEntry } from '@/lib/domains/talent/types'
import { PortfolioService } from '@/lib/domains/talent/services/portfolio.service'
import { createRepositoryContext } from '@/lib/repositories/context'
import { FreelancerRepository } from '@/lib/domains/talent/repositories/freelancer.repository'
import { PortfolioRepository } from '@/lib/domains/talent/repositories/portfolio.repository'

export async function getPortfolioItems(freelancerId: string): Promise<PortfolioItem[]> {
  const ctx = await createRepositoryContext()
  const portfolio = new PortfolioService(new FreelancerRepository(ctx), new PortfolioRepository(ctx))
  return portfolio.getItems(freelancerId)
}

export async function getRatingHistory(freelancerId: string): Promise<RatingHistoryEntry[]> {
  const services = await createServices()
  return services.talent.getRatingHistory(freelancerId)
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
