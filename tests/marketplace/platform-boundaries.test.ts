import { describe, expect, it } from 'vitest'
import { MARKETPLACE_BOUNDARIES } from '@/lib/marketplace/boundaries'

describe('Marketplace platform boundaries', () => {
  it('defines all supply subdomains', () => {
    expect(MARKETPLACE_BOUNDARIES.profiles.subdomain).toBe('profiles')
    expect(MARKETPLACE_BOUNDARIES.availability.subdomain).toBe('availability')
    expect(MARKETPLACE_BOUNDARIES.ratings.subdomain).toBe('ratings')
    expect(MARKETPLACE_BOUNDARIES.portfolio.subdomain).toBe('portfolio')
    expect(MARKETPLACE_BOUNDARIES.contracts.subdomain).toBe('contracts')
  })

  it('defines demand and matching subdomains', () => {
    expect(MARKETPLACE_BOUNDARIES.invitations.subdomain).toBe('invitations')
    expect(MARKETPLACE_BOUNDARIES.matching.subdomain).toBe('matching')
    expect(MARKETPLACE_BOUNDARIES.recommendations.subdomain).toBe('recommendations')
  })

  it('maps subdomain services in extension layer', () => {
    expect(MARKETPLACE_BOUNDARIES.matching.extension.services).toContain('MarketplaceMatchingService')
    expect(MARKETPLACE_BOUNDARIES.recommendations.extension.services).toContain(
      'MarketplaceRecommendationService'
    )
  })
})
