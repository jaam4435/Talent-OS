import { beforeEach, describe, expect, it } from 'vitest'
import { checkRateLimit, resetRateLimits } from '@/modules/core/api/rate-limit'
import { DistributedCache, resetDistributedCache } from '@/lib/redis/distributed-cache'

describe('distributed rate limiting (memory fallback)', () => {
  beforeEach(() => {
    resetRateLimits()
  })

  it('allows requests under limit', async () => {
    const result = await checkRateLimit('test-user-1', 'auth')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBeGreaterThan(0)
  })

  it('blocks requests over auth limit', async () => {
    const key = 'test-user-blocked'
    for (let i = 0; i < 10; i++) {
      await checkRateLimit(key, 'auth')
    }
    const blocked = await checkRateLimit(key, 'auth')
    expect(blocked.allowed).toBe(false)
  })
})

describe('distributed cache (memory fallback)', () => {
  beforeEach(() => {
    resetDistributedCache()
  })

  it('stores and retrieves values', async () => {
    const cache = new DistributedCache()
    await cache.set('test-key', { count: 42 }, 60_000)
    const value = await cache.get<{ count: number }>('test-key')
    expect(value?.count).toBe(42)
  })

  it('invalidates by prefix', async () => {
    const cache = new DistributedCache()
    await cache.set('table:{"a":1}', 'v1', 60_000)
    await cache.set('table:{"b":2}', 'v2', 60_000)
    await cache.invalidate('table:')
    expect(await cache.get('table:{"a":1}')).toBeUndefined()
  })
})
