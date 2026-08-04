import type { IConfigService } from '@/modules/platform/contracts/config-provider'
import type { IFeatureFlagService } from '@/modules/platform/contracts/feature-flag-provider'
import type { IPlatformEventEmitter } from '@/modules/platform/contracts/event-emitter'
import type { OrganizationContext } from '@/modules/platform/types'

export interface IPlatformClient {
  readonly featureFlags: IFeatureFlagService
  readonly config: IConfigService
  readonly events: IPlatformEventEmitter
  getContext(): Promise<OrganizationContext>
}
