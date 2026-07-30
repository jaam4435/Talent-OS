/**
 * @deprecated Use `createServices().portfolio` via `@/lib/services/factory` instead.
 */
export { PortfolioService } from '@/lib/services/portfolio.service'

export async function createTalentServices() {
  const { createServices } = await import('@/lib/services/factory')
  const services = await createServices()
  return {
    talent: services.talent,
    portfolio: services.portfolio,
    queries: {
      searchRoster: services.talent.searchRosterQuery.bind(services.talent),
      getRatingHistory: services.talent.getRatingHistory.bind(services.talent),
    },
  }
}

export type TalentServices = Awaited<ReturnType<typeof createTalentServices>>

export async function getPortfolioItems(freelancerId: string) {
  const { getPortfolioItems: load } = await import('@/lib/queries/talent.queries')
  return load(freelancerId)
}
