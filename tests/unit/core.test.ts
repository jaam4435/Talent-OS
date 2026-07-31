import { describe, expect, it } from 'vitest'
import { hasPermission, getPermissionsForRole } from '@/modules/core/services/permissions'
import { resolvePagination, toPaginatedResult } from '@/lib/repositories/base/types'
import { checkRateLimit, rateLimitKey } from '@/modules/core/api/rate-limit'

describe('permissions', () => {
  it('admin has analytics:read', () => {
    expect(hasPermission('admin', 'analytics:read')).toBe(true)
  })

  it('client lacks analytics:read', () => {
    expect(hasPermission('client', 'analytics:read')).toBe(false)
  })

  it('talent_manager has analytics:read', () => {
    expect(getPermissionsForRole('talent_manager')).toContain('analytics:read')
  })
})

describe('resolvePagination', () => {
  it('defaults to page 1 and limit 20', () => {
    expect(resolvePagination()).toEqual({ limit: 20, offset: 0, page: 1 })
  })

  it('caps limit at 100', () => {
    expect(resolvePagination({ limit: 500 }).limit).toBe(100)
  })
})

describe('toPaginatedResult', () => {
  it('sets hasMore when total exceeds page', () => {
    const result = toPaginatedResult([1, 2], { page: 1, limit: 2 }, 5)
    expect(result.hasMore).toBe(true)
  })
})

describe('rate limiting', () => {
  it('allows requests under the limit', async () => {
    const key = rateLimitKey({ ip: 'test-ip-unique-1' })
    const result = await checkRateLimit(key, 'auth')
    expect(result.allowed).toBe(true)
  })
})
