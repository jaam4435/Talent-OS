import type { ApiRequestContext } from '@/modules/core/api/context'
import { createConfigService } from '@/modules/platform/config/service'
import { createOrganizationContext } from '@/modules/platform/context/organization'
import type { OrganizationContextSource } from '@/modules/platform/context/resolver'
import { createFeatureFlagService } from '@/modules/platform/features/flags'
import { createPlatformEventEmitter } from '@/modules/platform/events/emitter'
import type { PlatformEventEmitFn } from '@/modules/platform/events/types'
import { ProductRegistry, assertProductEnabled } from '@/modules/platform/products/registry'
import { PlatformClient } from '@/modules/platform/sdk/client'
import type { IPlatformClient } from '@/modules/platform/contracts/platform-client'
import type { ProductId } from '@/modules/platform/types'

export interface CreatePlatformClientOptions {
  readonly productId: ProductId
  readonly getContext: () => Promise<OrganizationContextSource> | OrganizationContextSource
  readonly emitEvent?: PlatformEventEmitFn
  readonly skipEnabledCheck?: boolean
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
  const registry = new ProductRegistry()

  if (!options.skipEnabledCheck) {
    assertProductEnabled(options.productId, registry)
  }

  const products = registry
  const featureFlags = createFeatureFlagService({
    featureRepo: deps.featureRepo,
    tenantRepo: deps.tenantRepo,
  })
  const config = createConfigService({
    productRegistry: registry,
    configRepo: deps.configRepo,
  })

  const defaultEmit: PlatformEventEmitFn = async () => null
  const events = createPlatformEventEmitter(options.emitEvent ?? defaultEmit)

  const getContextFn = async () => {
    const source = await options.getContext()
    if ('productId' in source) {
      return source
    }
    return createOrganizationContext(options.productId, source as ApiRequestContext)
  }

  return new PlatformClient(
    options.productId,
    products,
    featureFlags,
    config,
    events,
    getContextFn
  )
}

export { PlatformClient }
