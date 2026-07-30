import { isDomainError } from '@/modules/core/utils/errors'
import type { MarketplaceProfileRepository } from '@/lib/repositories/marketplace/profile.repository'
import type { PublicPortfolioItem } from '@/modules/marketplace/types'
import { updatePortfolioVisibilitySchema } from '@/modules/marketplace/validation'

export class MarketplacePortfolioService {
  constructor(private readonly profileRepo: MarketplaceProfileRepository) {}

  async setItemVisibility(
    tenantId: string,
    portfolioItemId: string,
    isMarketplaceVisible: boolean,
    featured?: boolean
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const parsed = updatePortfolioVisibilitySchema.safeParse({
      portfolioItemId,
      isMarketplaceVisible,
      featured,
    })
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
    }

    try {
      const freelancerId = await this.profileRepo.findPortfolioItemFreelancerId(
        portfolioItemId,
        tenantId
      )
      if (!freelancerId) return { ok: false, error: 'Portfolio item not found' }

      await this.profileRepo.updatePortfolioVisibility(
        portfolioItemId,
        freelancerId,
        isMarketplaceVisible,
        featured
      )
      return { ok: true }
    } catch (error) {
      if (isDomainError(error)) return { ok: false, error: error.message }
      return { ok: false, error: error instanceof Error ? error.message : 'Update failed' }
    }
  }

  async listMarketplacePortfolio(
    _tenantId: string,
    freelancerId: string
  ): Promise<PublicPortfolioItem[]> {
    return this.profileRepo.listMarketplacePortfolio(freelancerId)
  }
}
