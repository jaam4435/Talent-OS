import { MARKETPLACE_BOUNDARIES } from '@/lib/marketplace/boundaries'
import {
  MarketplaceProfileService,
  MarketplaceAvailabilityService,
  MarketplaceRatingService,
  MarketplacePortfolioService,
  MarketplaceContractService,
  MarketplaceInviteService,
  MarketplaceMatchingService,
  MarketplaceRecommendationService,
  MarketplaceCapacityService,
} from '@/lib/marketplace/services'
import { createSupplyPlatform, type SupplyPlatform } from '@/lib/marketplace/platform/supply'
import { createDemandPlatform, type DemandPlatform } from '@/lib/marketplace/platform/demand'
import { createMatchingPlatform, type MatchingPlatform } from '@/lib/marketplace/platform/matching'
import type { MarketplaceServiceInterface } from '@/modules/marketplace/interfaces'
import type { MarketplaceSubdomain } from '@/modules/marketplace/types'
import type { Repositories } from '@/lib/repositories/factory'
import type { TalentService } from '@/lib/services/talent.service'
import type { AIService } from '@/lib/services/ai.service'
import type { AssignmentService } from '@/lib/services/assignment.service'
import type { CRMService } from '@/lib/services/crm.service'
import type { ProjectService } from '@/lib/services/project.service'
import type { WorkflowService } from '@/lib/services/workflow.service'

/**
 * Independent Marketplace Platform — composite facade over Supply, Demand, and Matching contexts.
 * Delegates to subdomain services; never accesses repositories from MCP or UI layers.
 */
export class MarketplaceService implements MarketplaceServiceInterface {
  readonly profile: MarketplaceProfileService
  readonly availability: MarketplaceAvailabilityService
  readonly rating: MarketplaceRatingService
  readonly portfolio: MarketplacePortfolioService
  readonly contract: MarketplaceContractService
  readonly invite: MarketplaceInviteService
  readonly matching: MarketplaceMatchingService
  readonly recommendation: MarketplaceRecommendationService

  readonly supply: SupplyPlatform
  readonly demand: DemandPlatform
  readonly match: MatchingPlatform
  readonly capacity: MarketplaceCapacityService

  constructor(
    repos: Repositories,
    talent: TalentService,
    ai: AIService,
    assignment: AssignmentService,
    crm: CRMService,
    project: ProjectService,
    workflow?: WorkflowService
  ) {
    this.profile = new MarketplaceProfileService(repos.marketplaceProfile, repos.marketplaceRating, workflow)
    this.availability = new MarketplaceAvailabilityService(repos.marketplaceAvailability)
    this.rating = new MarketplaceRatingService(repos.marketplaceRating)
    this.portfolio = new MarketplacePortfolioService(repos.marketplaceProfile)
    this.contract = new MarketplaceContractService(repos.marketplaceContract, workflow)
    this.invite = new MarketplaceInviteService(repos.marketplaceInvitation, workflow)

    this.matching = new MarketplaceMatchingService(ai, assignment, talent, crm, workflow)
    this.recommendation = new MarketplaceRecommendationService(
      repos.marketplaceRecommendation,
      crm,
      talent,
      this.matching,
      workflow
    )
    this.capacity = new MarketplaceCapacityService(
      repos.marketplaceProfile,
      repos.marketplaceAvailability,
      crm,
      project
    )

    this.supply = createSupplyPlatform({
      profile: this.profile,
      availability: this.availability,
      portfolio: this.portfolio,
      contract: this.contract,
      rating: this.rating,
    })

    this.demand = createDemandPlatform({
      crm,
      project,
      invite: this.invite,
    })

    this.match = createMatchingPlatform({
      matching: this.matching,
      recommendation: this.recommendation,
      capacity: this.capacity,
      reputation: this.rating,
    })
  }

  // ─── Legacy MCP adapter methods (delegate to subdomain services) ─────────

  async searchPublicProfiles(
    tenantId: string,
    input: { query?: string; discipline?: string; page?: number; limit?: number }
  ) {
    const result = await this.profile.searchMarketplaceProfiles(tenantId, input)
    return {
      items: result.data,
      page: input.page ?? 1,
      limit: input.limit ?? 20,
      total: result.total,
    }
  }

  async getPublicProfile(freelancerId: string, tenantId: string) {
    return this.profile.getPublishedProfile(tenantId, freelancerId)
  }

  async getMatchScores(opportunityId: string, tenantId: string) {
    return this.matching.getMatchResults(tenantId, opportunityId)
  }

  async requestMatch(input: { tenantId: string; opportunityId: string; actorId: string }) {
    return this.matching.runMatch(input.tenantId, {
      source: 'ai',
      opportunityId: input.opportunityId,
      candidatePool: 'tenant',
      filters: { actorId: input.actorId },
    })
  }

  getSubdomainBoundary(subdomain: MarketplaceSubdomain) {
    return MARKETPLACE_BOUNDARIES[subdomain]
  }

  listBoundaries() {
    return Object.values(MARKETPLACE_BOUNDARIES)
  }
}
