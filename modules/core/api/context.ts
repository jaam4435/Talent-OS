import { randomUUID } from 'crypto'
import type { SessionContext, TenantContext } from '@/modules/core/types/enums'
import type { UserRole } from '@/modules/core/types/enums'

/** Supported API version identifiers. */
export const API_VERSIONS = ['v1'] as const
export type ApiVersion = (typeof API_VERSIONS)[number]
export const DEFAULT_API_VERSION: ApiVersion = 'v1'
export const API_VERSION_HEADER = 'X-API-Version'

export function parseApiVersion(request: Request): ApiVersion {
  const header = request.headers.get(API_VERSION_HEADER)
  if (header === 'v1' || !header) return 'v1'
  return 'v1'
}

export interface ApiRequestContext {
  requestId: string
  correlationId: string
  apiVersion: ApiVersion
  idempotencyKey: string | null
  tenantId: string | null
  userId: string | null
  role: UserRole | null
  permissions: readonly string[]
  session: SessionContext | null
  tenant: TenantContext | null
}

export function createRequestContext(request: Request): ApiRequestContext {
  return {
    requestId: randomUUID(),
    correlationId: request.headers.get('X-Correlation-ID') ?? randomUUID(),
    apiVersion: parseApiVersion(request),
    idempotencyKey: request.headers.get('Idempotency-Key'),
    tenantId: null,
    userId: null,
    role: null,
    permissions: [],
    session: null,
    tenant: null,
  }
}

export function enrichContextFromSession(
  ctx: ApiRequestContext,
  session: SessionContext
): ApiRequestContext {
  return {
    ...ctx,
    session,
    tenant: session.tenant,
    tenantId: session.tenant?.id ?? null,
    userId: session.user.id,
    role: session.tenant?.role ?? null,
    permissions: session.permissions,
  }
}
