/**
 * Marketplace service interface contracts.
 * Implementation deferred to future phases — architecture only.
 */

import type {
  AggregatedRating,
  AvailabilityBlock,
  AvailabilityCheckParams,
  AvailabilityCheckResult,
  CreateAvailabilityBlockInput,
  CreateContractInput,
  CreateInvitationInput,
  CreateMarketplaceRatingInput,
  CreateRecommendationInput,
  MarketplaceContract,
  MarketplaceInvitation,
  MarketplaceMatchContext,
  MarketplaceRating,
  MarketplaceRecommendation,
  MarketplaceVisibility,
  MatchResult,
  PublicTalentProfile,
} from '@/modules/marketplace/types'

/** Talent profile publish/unpublish and public view assembly. */
export interface MarketplaceProfileServiceInterface {
  publishProfile(
    tenantId: string,
    userId: string,
    input: {
      freelancerId: string
      marketplaceVisibility: MarketplaceVisibility
      publicSlug?: string
      marketplaceHeadline?: string
      marketplaceBio?: string
    }
  ): Promise<{ ok: true } | { ok: false; error: string }>

  unpublishProfile(
    tenantId: string,
    freelancerId: string
  ): Promise<{ ok: true } | { ok: false; error: string }>

  getPublicProfile(publicSlug: string): Promise<PublicTalentProfile | null>

  searchMarketplaceProfiles(
    tenantId: string,
    params: {
      query?: string
      discipline?: string
      availability?: string
      minRate?: number
      maxRate?: number
      minRating?: number
      page?: number
      limit?: number
    }
  ): Promise<{ data: PublicTalentProfile[]; total?: number }>
}

/** Structured availability blocks and conflict detection. */
export interface MarketplaceAvailabilityServiceInterface {
  createBlock(
    tenantId: string,
    input: CreateAvailabilityBlockInput
  ): Promise<{ ok: true; blockId: string } | { ok: false; error: string }>

  listBlocks(tenantId: string, freelancerId: string): Promise<AvailabilityBlock[]>

  checkAvailability(
    tenantId: string,
    params: AvailabilityCheckParams
  ): Promise<AvailabilityCheckResult>

  deleteBlock(
    tenantId: string,
    blockId: string
  ): Promise<{ ok: true } | { ok: false; error: string }>
}

/** Public/client ratings separate from internal manager ratings. */
export interface MarketplaceRatingServiceInterface {
  createRating(
    tenantId: string,
    reviewerId: string,
    input: CreateMarketplaceRatingInput
  ): Promise<{ ok: true; ratingId: string } | { ok: false; error: string }>

  getAggregatedRating(
    tenantId: string,
    freelancerId: string,
    visibility?: MarketplaceVisibility
  ): Promise<AggregatedRating>

  listRatings(
    tenantId: string,
    freelancerId: string,
    options?: { source?: string; visibility?: MarketplaceVisibility }
  ): Promise<MarketplaceRating[]>
}

/** Portfolio marketplace visibility (extends TalentService). */
export interface MarketplacePortfolioServiceInterface {
  setItemVisibility(
    tenantId: string,
    portfolioItemId: string,
    isMarketplaceVisible: boolean,
    featured?: boolean
  ): Promise<{ ok: true } | { ok: false; error: string }>

  listMarketplacePortfolio(
    tenantId: string,
    freelancerId: string
  ): Promise<import('@/modules/marketplace/types').PublicPortfolioItem[]>
}

/** Contract lifecycle — draft through signed. */
export interface ContractServiceInterface {
  createContract(
    tenantId: string,
    userId: string,
    input: CreateContractInput
  ): Promise<{ ok: true; contractId: string } | { ok: false; error: string }>

  getContract(tenantId: string, contractId: string): Promise<MarketplaceContract | null>

  sendContract(
    tenantId: string,
    contractId: string
  ): Promise<{ ok: true } | { ok: false; error: string }>

  recordSignature(
    tenantId: string,
    contractId: string,
    partyId: string,
    signatureReference: string
  ): Promise<{ ok: true } | { ok: false; error: string }>
}

/** Marketplace invitations — distinct from team invites and broadcast. */
export interface MarketplaceInviteServiceInterface {
  createInvitation(
    tenantId: string,
    userId: string,
    input: CreateInvitationInput
  ): Promise<{ ok: true; invitationId: string } | { ok: false; error: string }>

  respondToInvitation(
    tenantId: string,
    invitationId: string,
    freelancerId: string,
    response: 'accepted' | 'declined',
    proposal?: CreateInvitationInput['proposal']
  ): Promise<{ ok: true } | { ok: false; error: string }>

  listInvitations(
    tenantId: string,
    filters?: { opportunityId?: string; freelancerId?: string; status?: string }
  ): Promise<MarketplaceInvitation[]>
}

/** Matching with marketplace candidate pool support. */
export interface MarketplaceMatchingServiceInterface {
  runMatch(
    tenantId: string,
    context: MarketplaceMatchContext
  ): Promise<{ ok: true; results: MatchResult[] } | { ok: false; error: string }>

  getMatchResults(
    tenantId: string,
    opportunityId: string
  ): Promise<MatchResult[]>
}

/** Proactive recommendations beyond single-opportunity matching. */
export interface MarketplaceRecommendationServiceInterface {
  createRecommendation(
    tenantId: string,
    input: CreateRecommendationInput
  ): Promise<{ ok: true; recommendationId: string } | { ok: false; error: string }>

  listRecommendations(
    tenantId: string,
    filters?: { type?: string; entityType?: string; entityId?: string }
  ): Promise<MarketplaceRecommendation[]>

  dismissRecommendation(
    tenantId: string,
    recommendationId: string
  ): Promise<{ ok: true } | { ok: false; error: string }>

  generateRecommendations(
    tenantId: string,
    options?: { types?: string[] }
  ): Promise<{ ok: true; count: number } | { ok: false; error: string }>
}

/** Top-level orchestrator (future). */
export interface MarketplaceServiceInterface {
  readonly profile: MarketplaceProfileServiceInterface
  readonly availability: MarketplaceAvailabilityServiceInterface
  readonly rating: MarketplaceRatingServiceInterface
  readonly portfolio: MarketplacePortfolioServiceInterface
  readonly contract: ContractServiceInterface
  readonly invite: MarketplaceInviteServiceInterface
  readonly matching: MarketplaceMatchingServiceInterface
  readonly recommendation: MarketplaceRecommendationServiceInterface
}
