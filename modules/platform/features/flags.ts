import type { PlatformFeatureRepository } from '@/lib/repositories/platform-feature.repository'
import type { TenantRepository } from '@/lib/repositories/tenant.repository'
import type {
  FeatureFlagEvaluateOptions,
  IFeatureFlagService,
} from '@/modules/platform/contracts/feature-flag-provider'
import { envFlagKey, LEGACY_TENANT_FLAG_MAP } from '@/modules/platform/features/registry'
import type { OrganizationContext, PlatformFeatureFlag, ProductId } from '@/modules/platform/types'

function readEnvFlag(productId: ProductId, flagKey: string): boolean | undefined {
  const specificKey = envFlagKey(productId, flagKey)
  const genericKey = `PLATFORM_FLAG_${flagKey.toUpperCase()}`

  const specific = process.env[specificKey]
  if (specific !== undefined) {
    return specific !== 'false' && specific !== '0'
  }

  const generic = process.env[genericKey]
  if (generic !== undefined) {
    return generic !== 'false' && generic !== '0'
  }

  return undefined
}

async function readLegacyTenantFlag(
  tenantRepo: TenantRepository | undefined,
  organizationId: string,
  flagKey: string
): Promise<boolean | undefined> {
  if (!tenantRepo || !LEGACY_TENANT_FLAG_MAP[flagKey]) {
    return undefined
  }

  const settings = await tenantRepo.getAiSettings(organizationId)

  if (flagKey === 'ai_matching') return settings.aiMatchingEnabled
  if (flagKey === 'ai_pm') return settings.aiPmEnabled

  return undefined
}

export class FeatureFlagService implements IFeatureFlagService {
  constructor(
    private readonly featureRepo?: PlatformFeatureRepository,
    private readonly tenantRepo?: TenantRepository
  ) {}

  async evaluate(
    productId: ProductId,
    flagKey: string,
    options: FeatureFlagEvaluateOptions = {}
  ): Promise<PlatformFeatureFlag> {
    const organizationId =
      options.context?.organizationId ?? options.organizationId ?? null

    const envValue = readEnvFlag(productId, flagKey)
    if (envValue !== undefined) {
      return { key: flagKey, enabled: envValue, source: 'env' }
    }

    if (organizationId && this.featureRepo) {
      const orgFlag = await this.featureRepo.getFlag(productId, flagKey, organizationId)
      if (orgFlag) {
        return {
          key: flagKey,
          enabled: orgFlag.enabled,
          value: orgFlag.value ?? undefined,
          source: 'organization',
        }
      }
    }

    if (this.featureRepo) {
      const platformFlag = await this.featureRepo.getFlag(productId, flagKey, null)
      if (platformFlag) {
        return {
          key: flagKey,
          enabled: platformFlag.enabled,
          value: platformFlag.value ?? undefined,
          source: 'platform',
        }
      }
    }

    if (organizationId) {
      const legacy = await readLegacyTenantFlag(this.tenantRepo, organizationId, flagKey)
      if (legacy !== undefined) {
        return { key: flagKey, enabled: legacy, source: 'legacy_tenant' }
      }
    }

    return { key: flagKey, enabled: false, source: 'platform' }
  }

  async isEnabled(
    productId: ProductId,
    flagKey: string,
    options?: FeatureFlagEvaluateOptions
  ): Promise<boolean> {
    const result = await this.evaluate(productId, flagKey, options)
    return result.enabled
  }
}

export function createFeatureFlagService(deps: {
  featureRepo?: PlatformFeatureRepository
  tenantRepo?: TenantRepository
}): FeatureFlagService {
  return new FeatureFlagService(deps.featureRepo, deps.tenantRepo)
}

export type { OrganizationContext }
