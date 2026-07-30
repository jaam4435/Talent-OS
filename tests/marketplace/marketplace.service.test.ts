import { describe, expect, it, vi } from 'vitest'
import { MarketplaceService } from '@/lib/services/marketplace.service'
import { createMockRepositories } from '@/tests/helpers/mock-repositories'

function createMarketplaceTestHarness() {
  const repos = createMockRepositories({
    marketplaceProfile: {
      searchMarketplace: vi.fn().mockResolvedValue({ data: [], count: 0 }),
      findPublishedById: vi.fn().mockResolvedValue(null),
      getCapacitySummary: vi.fn().mockResolvedValue({
        total: 5,
        byAvailability: { available: 3 },
        byDiscipline: { design: 2 },
      }),
    },
    marketplaceAvailability: {
      listByFreelancer: vi.fn().mockResolvedValue([]),
      checkAvailability: vi.fn().mockResolvedValue({ available: true, conflictingBlockCount: 0 }),
      sumCapacityInRange: vi.fn().mockResolvedValue(100),
    },
    marketplaceRating: {
      aggregate: vi.fn().mockResolvedValue({ average: 0, count: 0, bySource: {} }),
      create: vi.fn(),
      listByFreelancer: vi.fn().mockResolvedValue([]),
    },
    marketplaceContract: {
      create: vi.fn().mockResolvedValue('contract-1'),
      findById: vi.fn(),
      addParty: vi.fn(),
      addEvent: vi.fn(),
    },
    marketplaceInvitation: {
      create: vi.fn().mockResolvedValue('invite-1'),
      list: vi.fn().mockResolvedValue([]),
    },
    marketplaceRecommendation: {
      listActive: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue('rec-1'),
    },
  } as never)

  const talent = {
    searchRoster: vi.fn().mockResolvedValue([]),
    searchRosterQuery: vi.fn().mockResolvedValue([]),
    listMatchCandidates: vi.fn().mockResolvedValue([]),
    getTalentProfile: vi.fn(),
  }
  const ai = { requestTalentMatch: vi.fn().mockResolvedValue({ ok: true, aiRequestId: 'ai-1' }) }
  const assignment = { listDetailedMatchScores: vi.fn().mockResolvedValue([]) }
  const crm = {
    getOpportunitiesForPage: vi.fn().mockResolvedValue([]),
    listRecipientFreelancerIds: vi.fn().mockResolvedValue([]),
    getOpportunityDetail: vi.fn().mockResolvedValue(null),
  }
  const project = {}

  const service = new MarketplaceService(
    repos,
    talent as never,
    ai as never,
    assignment as never,
    crm as never,
    project as never
  )

  return { service, repos, talent, ai, crm }
}

describe('MarketplaceService', () => {
  it('exposes supply, demand, and matching platform contexts', () => {
    const { service } = createMarketplaceTestHarness()
    expect(service.supply.profile).toBeDefined()
    expect(service.supply.rating).toBeDefined()
    expect(service.demand.crm).toBeDefined()
    expect(service.match.matching).toBeDefined()
    expect(service.match.capacity).toBeDefined()
  })

  it('implements MarketplaceServiceInterface subdomain accessors', () => {
    const { service } = createMarketplaceTestHarness()
    expect(service.profile).toBe(service.supply.profile)
    expect(service.matching).toBe(service.match.matching)
    expect(service.recommendation).toBe(service.match.recommendation)
  })

  it('searchPublicProfiles delegates to profile service', async () => {
    const { service, repos } = createMarketplaceTestHarness()
    await service.searchPublicProfiles('tenant-1', { query: 'designer' })
    expect(repos.marketplaceProfile.searchMarketplace).toHaveBeenCalled()
  })
})
