import { createServices } from '@/lib/services/factory'
import type { PortfolioItem } from '@/lib/domains/talent/types'
import { PortfolioService } from '@/lib/domains/talent/services/portfolio.service'
import { createRepositoryContext } from '@/lib/repositories/context'
import { FreelancerRepository } from '@/lib/domains/talent/repositories/freelancer.repository'
import { PortfolioRepository } from '@/lib/domains/talent/repositories/portfolio.repository'

export async function createTalentServices() {
  const services = await createServices()
  const ctx = await createRepositoryContext()

  return {
    talent: services.talent,
    portfolio: new PortfolioService(new FreelancerRepository(ctx), new PortfolioRepository(ctx)),
    queries: {
      searchRoster: services.talent.searchRosterQuery.bind(services.talent),
      getRatingHistory: services.talent.getRatingHistory.bind(services.talent),
    },
  }
}

export type TalentServices = Awaited<ReturnType<typeof createTalentServices>>

export async function getPortfolioItems(freelancerId: string): Promise<PortfolioItem[]> {
  const { portfolio } = await createTalentServices()
  return portfolio.getItems(freelancerId)
}
