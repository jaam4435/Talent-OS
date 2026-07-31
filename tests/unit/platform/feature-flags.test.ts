import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFeatureFlagService } from '@/modules/platform/features/flags'
import type { PlatformFeatureRepository } from '@/lib/repositories/platform-feature.repository'
import type { TenantRepository } from '@/lib/repositories/tenant.repository'

function mockFeatureRepo(
  overrides: Partial<
    Record<'platform' | 'org', { enabled: boolean; value?: unknown } | null>
  > = {}
): PlatformFeatureRepository {
  return {
    getFlag: vi.fn(async (_productId, _flagKey, tenantId) => {
      if (tenantId === null) {
        if (!overrides.platform) return null
        return {
          flagKey: _flagKey,
          enabled: overrides.platform.enabled,
          value: overrides.platform.value ?? null,
          tenantId: null,
        }
      }
      if (!overrides.org) return null
      return {
        flagKey: _flagKey,
        enabled: overrides.org.enabled,
        value: overrides.org.value ?? null,
        tenantId,
      }
    }),
  } as unknown as PlatformFeatureRepository
}

function mockTenantRepo(settings: {
  aiMatchingEnabled?: boolean
  aiPmEnabled?: boolean
}): TenantRepository {
  return {
    getAiSettings: vi.fn(async () => ({
      aiMatchingEnabled: settings.aiMatchingEnabled ?? true,
      aiPmEnabled: settings.aiPmEnabled ?? true,
      maxAiRequestsMonthly: 1000,
    })),
  } as unknown as TenantRepository
}

describe('FeatureFlagService', () => {
  const envKeysToClean = [
    'PLATFORM_FLAG_TALENT_OS_AI_MATCHING',
    'PLATFORM_FLAG_AI_MATCHING',
  ]

  afterEach(() => {
    for (const key of envKeysToClean) {
      delete process.env[key]
    }
  })

  it('env flag overrides org and platform defaults', async () => {
    process.env.PLATFORM_FLAG_TALENT_OS_AI_MATCHING = 'false'
    const service = createFeatureFlagService({
      featureRepo: mockFeatureRepo({
        platform: { enabled: true },
        org: { enabled: true },
      }),
    })

    const result = await service.evaluate('talent_os', 'ai_matching', {
      organizationId: 'tenant-1',
    })

    expect(result.enabled).toBe(false)
    expect(result.source).toBe('env')
  })

  it('org override beats platform default', async () => {
    const service = createFeatureFlagService({
      featureRepo: mockFeatureRepo({
        platform: { enabled: false },
        org: { enabled: true },
      }),
    })

    const result = await service.evaluate('talent_os', 'hybrid_search', {
      organizationId: 'tenant-1',
    })

    expect(result.enabled).toBe(true)
    expect(result.source).toBe('organization')
  })

  it('falls back to platform default when no org override', async () => {
    const service = createFeatureFlagService({
      featureRepo: mockFeatureRepo({ platform: { enabled: true } }),
    })

    const result = await service.evaluate('talent_os', 'workflow_engine', {
      organizationId: 'tenant-1',
    })

    expect(result.enabled).toBe(true)
    expect(result.source).toBe('platform')
  })

  it('falls back to legacy tenant settings for ai flags', async () => {
    const service = createFeatureFlagService({
      featureRepo: mockFeatureRepo({}),
      tenantRepo: mockTenantRepo({ aiMatchingEnabled: false }),
    })

    const result = await service.evaluate('talent_os', 'ai_matching', {
      organizationId: 'tenant-1',
    })

    expect(result.enabled).toBe(false)
    expect(result.source).toBe('legacy_tenant')
  })

  it('isEnabled returns boolean', async () => {
    const service = createFeatureFlagService({
      featureRepo: mockFeatureRepo({ platform: { enabled: true } }),
    })

    expect(
      await service.isEnabled('talent_os', 'workflow_engine', {
        organizationId: 'tenant-1',
      })
    ).toBe(true)
  })
})
