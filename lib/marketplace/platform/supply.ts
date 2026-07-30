import type { MarketplaceProfileService } from '@/lib/marketplace/services/profile.service'
import type { MarketplaceAvailabilityService } from '@/lib/marketplace/services/availability.service'
import type { MarketplaceRatingService } from '@/lib/marketplace/services/rating.service'
import type { MarketplacePortfolioService } from '@/lib/marketplace/services/portfolio.service'
import type { MarketplaceContractService } from '@/lib/marketplace/services/contract.service'

/** Supply-side marketplace context: talent, availability, portfolio, contracts, ratings. */
export interface SupplyPlatform {
  readonly profile: MarketplaceProfileService
  readonly availability: MarketplaceAvailabilityService
  readonly portfolio: MarketplacePortfolioService
  readonly contract: MarketplaceContractService
  readonly rating: MarketplaceRatingService
}

export function createSupplyPlatform(services: SupplyPlatform): SupplyPlatform {
  return services
}
