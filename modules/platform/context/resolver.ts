import type { ApiRequestContext } from '@/modules/core/api/context'
import { createOrganizationContext } from '@/modules/platform/context/organization'
import type { OrganizationContext } from '@/modules/platform/types'

export type OrganizationContextSource = ApiRequestContext | OrganizationContext

export function resolveOrganizationContext(source: OrganizationContextSource): OrganizationContext {
  if ('organizationId' in source) {
    return source
  }

  return createOrganizationContext(source)
}

export async function resolveOrganizationContextAsync(
  getContext: () => Promise<OrganizationContextSource> | OrganizationContextSource
): Promise<OrganizationContext> {
  const source = await getContext()
  return resolveOrganizationContext(source)
}
