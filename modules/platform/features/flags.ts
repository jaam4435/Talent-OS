import type { PlatformFeatureRepository } from '@/lib/repositories/platform-feature.repository'
import type { TenantRepository } from '@/lib/repositories/tenant.repository'
import type {
  FeatureFlagEvaluateOptions,
  IFeatureFlagService,
} from '@/modules/platform/contracts/feature-flag-provider'
import { LEGACY_TENANT_FLAG_MAP, envFlagKey } from '@/modules/platform/features/registry'
import type { OrganizationContext, PlatformFeatureFlag } from '@/modules/platform/types'

function readEnvFlag(flagKey: string): boolean | undefined {
  const genericKey = envFlagKey(flagKey)
  const value = process.env[genericKey]
  if (value === undefined) return undefined
  return value !== 'false' && value !== '0'
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
    flagKey: string,
    options: FeatureFlagEvaluateOptions = {}
  ): Promise<PlatformFeatureFlag> {
    const organizationId =
      options.context?.organizationId ?? options.organizationId ?? null

    const envValue = readEnvFlag(flagKey)
    if (envValue !== undefined) {
      return { key: flagKey, enabled: envValue, source: 'env' }
    }

    if (organizationId && this.featureRepo) {
      const orgFlag = await this.featureRepo.getFlag(flagKey, organizationId)
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
      const platformFlag = await this.featureRepo.getFlag(flagKey, null)
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

  async isEnabled(flagKey: string, options?: FeatureFlagEvaluateOptions): Promise<boolean> {
    const result = await this.evaluate(flagKey, options)
    return result.enabled
  }
}

export function createFeatureFlagService(deps: {
  featureRepo?: PlatformFeatureRepository
  tenantRepo?: TenantRepository
}): FeatureFlagService {
  return new FeatureFlagService(deps.featureRepo, deps.tenantRepo)
}
