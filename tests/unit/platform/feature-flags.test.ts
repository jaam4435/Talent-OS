import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFeatureFlagService } from '@/modules/platform/features/flags'
import type { PlatformFeatureRepository } from '@/lib/repositories/platform-feature.repository'
import type { TenantRepository } from '@/lib/repositories/tenant.repository'

function mockFeatureRepo(
  overrides: Partial<Record<'platform' | 'org', { enabled: boolean } | null>> = {}
): PlatformFeatureRepository {
  return {
    getFlag: vi.fn(async (flagKey, tenantId) => {
      if (tenantId === null) {
        if (!overrides.platform) return null
        return {
          flagKey,
          enabled: overrides.platform.enabled,
          value: null,
          tenantId: null,
        }
      }
      if (!overrides.org) return null
      return {
        flagKey,
        enabled: overrides.org.enabled,
        value: null,
        tenantId,
      }
    }),
  } as unknown as PlatformFeatureRepository
}

function mockTenantRepo(settings: { aiMatchingEnabled?: boolean }): TenantRepository {
  return {
    getAiSettings: vi.fn(async () => ({
      aiMatchingEnabled: settings.aiMatchingEnabled ?? true,
      aiPmEnabled: true,
      maxAiRequestsMonthly: 1000,
    })),
  } as unknown as TenantRepository
}

describe('FeatureFlagService', () => {
  afterEach(() => {
    delete process.env.PLATFORM_FLAG_AI_MATCHING
  })

  it('env flag overrides org and platform defaults', async () => {
    process.env.PLATFORM_FLAG_AI_MATCHING = 'false'
    const service = createFeatureFlagService({
      featureRepo: mockFeatureRepo({ platform: { enabled: true }, org: { enabled: true } }),
    })
    const result = await service.evaluate('ai_matching', { organizationId: 'tenant-1' })
    expect(result.enabled).toBe(false)
    expect(result.source).toBe('env')
  })

  it('org override beats platform default', async () => {
    const service = createFeatureFlagService({
      featureRepo: mockFeatureRepo({ platform: { enabled: false }, org: { enabled: true } }),
    })
    const result = await service.evaluate('hybrid_search', { organizationId: 'tenant-1' })
    expect(result.enabled).toBe(true)
    expect(result.source).toBe('organization')
  })

  it('falls back to legacy tenant settings for ai flags', async () => {
    const service = createFeatureFlagService({
      featureRepo: mockFeatureRepo({}),
      tenantRepo: mockTenantRepo({ aiMatchingEnabled: false }),
    })
    const result = await service.evaluate('ai_matching', { organizationId: 'tenant-1' })
    expect(result.enabled).toBe(false)
    expect(result.source).toBe('legacy_tenant')
  })
})
