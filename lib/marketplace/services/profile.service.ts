import { isDomainError } from '@/modules/core/utils/errors'
import type { MarketplaceProfileRepository } from '@/lib/repositories/marketplace/profile.repository'
import type { MarketplaceRatingRepository } from '@/lib/repositories/marketplace/rating.repository'
import { MarketplaceEvents } from '@/modules/marketplace/events'
import type { MarketplaceVisibility, PublicTalentProfile } from '@/modules/marketplace/types'
import { publishProfileSchema, marketplaceSearchSchema } from '@/modules/marketplace/validation'
import type { WorkflowService } from '@/lib/services/workflow.service'

export class MarketplaceProfileService {
  constructor(
    private readonly profileRepo: MarketplaceProfileRepository,
    private readonly ratingRepo: MarketplaceRatingRepository,
    private readonly workflow?: WorkflowService
  ) {}

  async publishProfile(
    tenantId: string,
    userId: string,
    input: {
      freelancerId: string
      marketplaceVisibility: MarketplaceVisibility
      publicSlug?: string
      marketplaceHeadline?: string
      marketplaceBio?: string
    }
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const parsed = publishProfileSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
    }

    try {
      await this.profileRepo.publish(tenantId, parsed.data.freelancerId, {
        marketplaceVisibility: parsed.data.marketplaceVisibility,
        publicSlug: parsed.data.publicSlug,
        marketplaceHeadline: parsed.data.marketplaceHeadline,
        marketplaceBio: parsed.data.marketplaceBio,
      })

      if (parsed.data.marketplaceVisibility === 'marketplace' && this.workflow) {
        await this.workflow.emitEvent({
          tenantId,
          eventType: MarketplaceEvents.PROFILE_PUBLISHED,
          aggregateType: 'freelancer',
          aggregateId: parsed.data.freelancerId,
          idempotencyKey: `marketplace-profile:${parsed.data.freelancerId}`,
          actorId: userId,
          payload: {
            freelancer_id: parsed.data.freelancerId,
            public_slug: parsed.data.publicSlug,
          },
        })
      }

      return { ok: true }
    } catch (error) {
      if (isDomainError(error)) return { ok: false, error: error.message }
      return { ok: false, error: error instanceof Error ? error.message : 'Publish failed' }
    }
  }

  async unpublishProfile(tenantId: string, freelancerId: string) {
    try {
      await this.profileRepo.unpublish(tenantId, freelancerId)
      return { ok: true as const }
    } catch (error) {
      if (isDomainError(error)) return { ok: false as const, error: error.message }
      return { ok: false as const, error: error instanceof Error ? error.message : 'Unpublish failed' }
    }
  }

  async getPublishedProfile(tenantId: string, freelancerId: string): Promise<PublicTalentProfile | null> {
    const profile = await this.profileRepo.findPublishedById(tenantId, freelancerId)
    if (!profile) return null

    const [rating, portfolio] = await Promise.all([
      this.ratingRepo.aggregate(tenantId, freelancerId, 'marketplace'),
      this.profileRepo.listMarketplacePortfolio(freelancerId),
    ])

    return {
      ...profile,
      publicRating: rating.count ? rating.average : null,
      portfolioPreview: portfolio.slice(0, 6),
    }
  }

  async getPublicProfile(publicSlug: string): Promise<PublicTalentProfile | null> {
    const found = await this.profileRepo.findByPublicSlug(publicSlug)
    if (!found) return null

    const { profile, tenantId } = found
    const rating = await this.ratingRepo.aggregate(tenantId, profile.id, 'marketplace')
    const portfolio = await this.profileRepo.listMarketplacePortfolio(profile.id)

    return {
      ...profile,
      publicRating: rating.count ? rating.average : null,
      portfolioPreview: portfolio.slice(0, 6),
    }
  }

  async searchMarketplaceProfiles(
    tenantId: string,
    params: {
      query?: string
      discipline?: string
      availability?: string
      minRate?: number
      maxRate?: number
      page?: number
      limit?: number
    }
  ) {
    const parsed = marketplaceSearchSchema.safeParse(params)
    if (!parsed.success) {
      return { data: [] as PublicTalentProfile[], total: 0 }
    }

    const limit = parsed.data.limit ?? 20
    const page = parsed.data.page ?? 1
    const offset = (page - 1) * limit

    const result = await this.profileRepo.searchMarketplace(tenantId, {
      ...parsed.data,
      limit,
      offset,
    })

    const enriched = await Promise.all(
      result.data.map(async (profile) => {
        const [rating, portfolio] = await Promise.all([
          this.ratingRepo.aggregate(tenantId, profile.id),
          this.profileRepo.listMarketplacePortfolio(profile.id),
        ])
        return {
          ...profile,
          publicRating: rating.count ? rating.average : null,
          portfolioPreview: portfolio.slice(0, 3),
        }
      })
    )

    return { data: enriched, total: result.count }
  }
}
