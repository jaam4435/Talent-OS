import type { MarketplaceMatchingService } from '@/lib/marketplace/services/matching.service'
import type { MarketplaceRecommendationService } from '@/lib/marketplace/services/recommendation.service'
import type { MarketplaceCapacityService } from '@/lib/marketplace/services/capacity.service'
import type { MarketplaceRatingService } from '@/lib/marketplace/services/rating.service'

/** Matching context: AI matching, recommendations, reputation, capacity planning. */
export interface MatchingPlatform {
  readonly matching: MarketplaceMatchingService
  readonly recommendation: MarketplaceRecommendationService
  readonly capacity: MarketplaceCapacityService
  /** Public/client reputation feeds match ranking. */
  readonly reputation: MarketplaceRatingService
}

export function createMatchingPlatform(services: MatchingPlatform): MatchingPlatform {
  return services
}
