import { describe, expect, it } from 'vitest'
import {
  createOrganizationContext,
  createSystemOrganizationContext,
} from '@/modules/platform/context/organization'
import {
  resolveOrganizationContext,
  resolveOrganizationContextAsync,
} from '@/modules/platform/context/resolver'
import type { ApiRequestContext } from '@/modules/core/api/context'

const baseApiContext: ApiRequestContext = {
  requestId: 'req-1',
  correlationId: 'corr-1',
  apiVersion: 'v1',
  idempotencyKey: null,
  tenantId: 'tenant-abc',
  userId: 'user-1',
  role: 'talent_manager',
  permissions: ['projects:read'],
  session: null,
  tenant: null,
}

describe('OrganizationContext', () => {
  it('maps tenantId to organizationId', () => {
    const org = createOrganizationContext('talent_os', baseApiContext)
    expect(org.organizationId).toBe('tenant-abc')
    expect(org.productId).toBe('talent_os')
    expect(org.correlationId).toBe('corr-1')
  })

  it('throws without tenantId', () => {
    expect(() =>
      createOrganizationContext('talent_os', { ...baseApiContext, tenantId: null })
    ).toThrow('Organization context requires tenantId')
  })

  it('creates system context for background jobs', () => {
    const org = createSystemOrganizationContext(
      'talent_os',
      'tenant-abc',
      'corr-bg',
      'req-bg'
    )
    expect(org.userId).toBeNull()
    expect(org.organizationId).toBe('tenant-abc')
  })

  it('resolves from ApiRequestContext', () => {
    const org = resolveOrganizationContext('talent_os', baseApiContext)
    expect(org.organizationId).toBe('tenant-abc')
    expect(org.role).toBe('talent_manager')
  })

  it('returns existing OrganizationContext unchanged', async () => {
    const existing = createOrganizationContext('talent_os', baseApiContext)
    const resolved = await resolveOrganizationContextAsync('talent_os', () => existing)
    expect(resolved).toBe(existing)
  })
})
