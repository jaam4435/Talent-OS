import type { ApiRequestContext } from '@/modules/core/api/context'
import { createOrganizationContext } from '@/modules/platform/context/organization'
import type { OrganizationContext, ProductId } from '@/modules/platform/types'

export type OrganizationContextSource = ApiRequestContext | OrganizationContext

export function resolveOrganizationContext(
  productId: ProductId,
  source: OrganizationContextSource
): OrganizationContext {
  if ('productId' in source && 'organizationId' in source) {
    return source.productId === productId ? source : createOrganizationContext(productId, {
      tenantId: source.organizationId,
      userId: source.userId,
      role: source.role,
      permissions: source.permissions,
      correlationId: source.correlationId,
      requestId: source.requestId,
    })
  }

  return createOrganizationContext(productId, source)
}

export async function resolveOrganizationContextAsync(
  productId: ProductId,
  getContext: () => Promise<OrganizationContextSource> | OrganizationContextSource
): Promise<OrganizationContext> {
  const source = await getContext()
  return resolveOrganizationContext(productId, source)
}
