import type { IConfigService } from '@/modules/platform/contracts/config-provider'
import type { IFeatureFlagService } from '@/modules/platform/contracts/feature-flag-provider'
import type { IPlatformEventEmitter } from '@/modules/platform/contracts/event-emitter'
import type { IProductRegistry } from '@/modules/platform/contracts/product-registry'
import type { OrganizationContext, ProductId } from '@/modules/platform/types'

export interface IPlatformClient {
  readonly productId: ProductId
  readonly products: IProductRegistry
  readonly featureFlags: IFeatureFlagService
  readonly config: IConfigService
  readonly events: IPlatformEventEmitter
  getContext(): Promise<OrganizationContext>
}
