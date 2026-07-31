import type { ApiRequestContext } from '@/modules/core/api/context'
import { createConfigService } from '@/modules/platform/config/service'
import { createOrganizationContext } from '@/modules/platform/context/organization'
import type { OrganizationContextSource } from '@/modules/platform/context/resolver'
import { createFeatureFlagService } from '@/modules/platform/features/flags'
import { createPlatformEventEmitter } from '@/modules/platform/events/emitter'
import type { PlatformEventEmitFn } from '@/modules/platform/events/types'
import { PlatformClient } from '@/modules/platform/sdk/client'
import type { IPlatformClient } from '@/modules/platform/contracts/platform-client'
import type { OrganizationContext } from '@/modules/platform/types'

export interface CreatePlatformClientOptions {
  readonly getContext: () => Promise<OrganizationContextSource> | OrganizationContextSource
  readonly emitEvent?: PlatformEventEmitFn
}

export interface PlatformClientDependencies {
  featureRepo?: import('@/lib/repositories/platform-feature.repository').PlatformFeatureRepository
  configRepo?: import('@/lib/repositories/platform-config.repository').PlatformConfigRepository
  tenantRepo?: import('@/lib/repositories/tenant.repository').TenantRepository
}

export function createPlatformClient(
  options: CreatePlatformClientOptions,
  deps: PlatformClientDependencies = {}
): IPlatformClient {
  const featureFlags = createFeatureFlagService({
    featureRepo: deps.featureRepo,
    tenantRepo: deps.tenantRepo,
  })
  const config = createConfigService({ configRepo: deps.configRepo })

  const defaultEmit: PlatformEventEmitFn = async () => null
  const events = createPlatformEventEmitter(options.emitEvent ?? defaultEmit)

  const getContextFn = async () => {
    const source = await options.getContext()
    if ('organizationId' in source) {
      return source
    }
    return createOrganizationContext(source as ApiRequestContext)
  }

  return new PlatformClient(featureFlags, config, events, getContextFn)
}

export { PlatformClient }
