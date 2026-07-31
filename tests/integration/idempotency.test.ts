import { beforeEach, describe, expect, it } from 'vitest'
import {
  buildIdempotencyKey,
  getIdempotentResponse,
  resetIdempotencyStore,
  storeIdempotentResponse,
} from '@/modules/core/api/idempotency'
import { resetMemoryStore } from '@/lib/redis/memory-store'

describe('distributed idempotency (memory fallback)', () => {
  beforeEach(() => {
    resetIdempotencyStore()
    resetMemoryStore()
    process.env.IDEMPOTENCY_STORE = 'memory'
  })

  it('returns null for unknown keys', async () => {
    expect(await getIdempotentResponse('unknown-key')).toBeNull()
  })

  it('stores and retrieves responses', async () => {
    const key = buildIdempotencyKey('tenant-1', 'key-abc', 'POST', '/api/ai/match')!
    await storeIdempotentResponse(key, 200, { queued: true })
    const cached = await getIdempotentResponse(key)
    expect(cached?.status).toBe(200)
    expect(cached?.body).toEqual({ queued: true })
  })

  it('buildIdempotencyKey returns null without header key', () => {
    expect(buildIdempotencyKey('t', null, 'POST', '/x')).toBeNull()
  })
})
