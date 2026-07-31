import { resolveOrganizationContextAsync } from '@/modules/platform/context/resolver'
import type { IPlatformClient } from '@/modules/platform/contracts/platform-client'
import type { IConfigService } from '@/modules/platform/contracts/config-provider'
import type { IFeatureFlagService } from '@/modules/platform/contracts/feature-flag-provider'
import type { IPlatformEventEmitter } from '@/modules/platform/contracts/event-emitter'
import type { OrganizationContext } from '@/modules/platform/types'

export class PlatformClient implements IPlatformClient {
  constructor(
    readonly featureFlags: IFeatureFlagService,
    readonly config: IConfigService,
    readonly events: IPlatformEventEmitter,
    private readonly getContextFn: () => Promise<OrganizationContext> | OrganizationContext
  ) {}

  getContext(): Promise<OrganizationContext> {
    return resolveOrganizationContextAsync(this.getContextFn)
  }
}
