import type { UserRole } from '@/modules/core/types/enums'

/** Canonical product identifiers — single source of truth for all platform waves. */
export type ProductId = 'talent_os' | 'media_intel' | 'ad_studio'

export const PRODUCT_IDS = ['talent_os', 'media_intel', 'ad_studio'] as const satisfies readonly ProductId[]

/** Immutable request-scoped organization context (maps tenantId → organizationId). */
export interface OrganizationContext {
  readonly organizationId: string
  readonly userId: string | null
  readonly role: UserRole | null
  readonly permissions: readonly string[]
  readonly correlationId: string
  readonly requestId: string
  readonly productId: ProductId
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
  readonly productId: ProductId
  readonly organizationId: string
  readonly correlationId: string
  readonly requestId?: string
  readonly actorId?: string | null
  readonly data?: Record<string, unknown>
}

export function isProductId(value: string): value is ProductId {
  return (PRODUCT_IDS as readonly string[]).includes(value)
}
