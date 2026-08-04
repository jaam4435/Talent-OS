import type { OrganizationContext, PlatformConfigScope } from '@/modules/platform/types'

export interface ConfigGetOptions {
  readonly organizationId?: string | null
  readonly context?: OrganizationContext | null
  readonly requestOverride?: Record<string, unknown>
}

export interface ConfigValue<T = unknown> {
  readonly value: T
  readonly source: PlatformConfigScope
}

export interface IConfigService {
  get<T = unknown>(configKey: string, options?: ConfigGetOptions): Promise<ConfigValue<T>>
  getMerged(options?: ConfigGetOptions): Promise<Record<string, unknown>>
}
