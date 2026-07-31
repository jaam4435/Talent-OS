import type { ApiRequestContext } from '@/modules/core/api/context'
import type { OrganizationContext } from '@/modules/platform/types'

export function createOrganizationContext(
  ctx: Pick<
    ApiRequestContext,
    'tenantId' | 'userId' | 'role' | 'permissions' | 'correlationId' | 'requestId'
  >
): OrganizationContext {
  if (!ctx.tenantId) {
    throw new Error('Organization context requires tenantId')
  }

  return Object.freeze({
    organizationId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    permissions: ctx.permissions,
    correlationId: ctx.correlationId,
    requestId: ctx.requestId,
  })
}

export function createSystemOrganizationContext(
  organizationId: string,
  correlationId: string,
  requestId: string
): OrganizationContext {
  return Object.freeze({
    organizationId,
    userId: null,
    role: null,
    permissions: [],
    correlationId,
    requestId,
  })
}
