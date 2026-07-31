import type { UserRole } from '@/modules/core/types/enums'

/** Talent OS is the only product in this repository. */
export const TALENT_OS_PRODUCT_ID = 'talent_os' as const

/** Immutable request-scoped organization context (maps tenantId → organizationId). */
export interface OrganizationContext {
  readonly organizationId: string
  readonly userId: string | null
  readonly role: UserRole | null
  readonly permissions: readonly string[]
  readonly correlationId: string
  readonly requestId: string
}

export type PlatformConfigScope = 'env' | 'platform' | 'organization' | 'request'

export interface PlatformFeatureFlag {
  readonly key: string
  readonly enabled: boolean
  readonly value?: unknown
  readonly source: PlatformConfigScope | 'legacy_tenant'
}

export type PlatformEventNamespace = 'platform' | 'ai'

export type PlatformEventType =
  | `${PlatformEventNamespace}.${string}`
  | (string & {})

export interface PlatformEventPayload {
  readonly organizationId: string
  readonly correlationId: string
  readonly requestId?: string
  readonly actorId?: string | null
  readonly data?: Record<string, unknown>
}

/** Default platform config for Talent OS (mirrors migration seed). */
export const TALENT_OS_DEFAULT_CONFIG: Record<string, unknown> = {
  ai: {
    defaultProvider: 'openai',
    maxConcurrentRequests: 10,
  },
}
