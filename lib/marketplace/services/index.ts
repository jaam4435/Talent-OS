/** Independent Marketplace Platform — Supply / Demand / Matching contexts. */

export { MarketplaceProfileService } from '@/lib/marketplace/services/profile.service'
export { MarketplaceAvailabilityService } from '@/lib/marketplace/services/availability.service'
export { MarketplaceRatingService } from '@/lib/marketplace/services/rating.service'
export { MarketplacePortfolioService } from '@/lib/marketplace/services/portfolio.service'
export { MarketplaceContractService } from '@/lib/marketplace/services/contract.service'
export { MarketplaceInviteService } from '@/lib/marketplace/services/invite.service'
export { MarketplaceMatchingService } from '@/lib/marketplace/services/matching.service'
export { MarketplaceRecommendationService } from '@/lib/marketplace/services/recommendation.service'
export { MarketplaceCapacityService } from '@/lib/marketplace/services/capacity.service'

export type { SupplyPlatform } from '@/lib/marketplace/platform/supply'
export type { DemandPlatform } from '@/lib/marketplace/platform/demand'
export type { MatchingPlatform } from '@/lib/marketplace/platform/matching'
