import { isDomainError } from '@/modules/core/utils/errors'
import type { MarketplaceRatingRepository } from '@/lib/repositories/marketplace/rating.repository'
import type {
  AggregatedRating,
  CreateMarketplaceRatingInput,
  MarketplaceRating,
  MarketplaceVisibility,
} from '@/modules/marketplace/types'
import { createMarketplaceRatingSchema } from '@/modules/marketplace/validation'

export class MarketplaceRatingService {
  constructor(private readonly ratings: MarketplaceRatingRepository) {}

  async createRating(
    tenantId: string,
    reviewerId: string,
    input: CreateMarketplaceRatingInput
  ): Promise<{ ok: true; ratingId: string } | { ok: false; error: string }> {
    const parsed = createMarketplaceRatingSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
    }

    try {
      const ratingId = await this.ratings.create(tenantId, reviewerId, parsed.data)
      return { ok: true, ratingId }
    } catch (error) {
      if (isDomainError(error)) return { ok: false, error: error.message }
      return { ok: false, error: error instanceof Error ? error.message : 'Create failed' }
    }
  }

  async getAggregatedRating(
    tenantId: string,
    freelancerId: string,
    visibility?: MarketplaceVisibility
  ): Promise<AggregatedRating> {
    return this.ratings.aggregate(tenantId, freelancerId, visibility)
  }

  async listRatings(
    tenantId: string,
    freelancerId: string,
    options?: { source?: CreateMarketplaceRatingInput['source']; visibility?: MarketplaceVisibility }
  ): Promise<MarketplaceRating[]> {
    return this.ratings.listByFreelancer(tenantId, freelancerId, options)
  }
}
