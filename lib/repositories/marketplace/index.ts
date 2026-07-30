export { MarketplaceProfileRepository } from '@/lib/repositories/marketplace/profile.repository'
export { AvailabilityBlockRepository } from '@/lib/repositories/marketplace/availability-block.repository'
export { MarketplaceRatingRepository } from '@/lib/repositories/marketplace/rating.repository'
export { MarketplaceContractRepository } from '@/lib/repositories/marketplace/contract.repository'
export { MarketplaceInvitationRepository } from '@/lib/repositories/marketplace/invitation.repository'
export { MarketplaceRecommendationRepository } from '@/lib/repositories/marketplace/recommendation.repository'

export interface MarketplaceRepositories {
  profile: import('@/lib/repositories/marketplace/profile.repository').MarketplaceProfileRepository
  availabilityBlock: import('@/lib/repositories/marketplace/availability-block.repository').AvailabilityBlockRepository
  rating: import('@/lib/repositories/marketplace/rating.repository').MarketplaceRatingRepository
  contract: import('@/lib/repositories/marketplace/contract.repository').MarketplaceContractRepository
  invitation: import('@/lib/repositories/marketplace/invitation.repository').MarketplaceInvitationRepository
  recommendation: import('@/lib/repositories/marketplace/recommendation.repository').MarketplaceRecommendationRepository
}
