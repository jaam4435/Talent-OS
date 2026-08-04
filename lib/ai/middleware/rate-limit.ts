import { checkRateLimit } from '@/modules/core/api/rate-limit'
import { AiRateLimitError } from '@/lib/ai/errors'
import type { RateLimitState } from '@/lib/ai/types'

/** Distributed AI gateway rate limiter (uses shared Redis/memory store). */
export class RateLimiter {
  constructor(private readonly requestsPerMinute: number) {}

  async check(key = 'global'): Promise<RateLimitState> {
    const result = await checkRateLimit(`ai:${key}`, 'ai')
    const resetAt = new Date(result.resetAt)

    return {
      remaining: result.remaining,
      resetAt,
      limited: !result.allowed,
    }
  }

  async consume(key = 'global'): Promise<void> {
    const state = await this.check(key)
    if (state.limited) {
      throw new AiRateLimitError(state.resetAt)
    }
  }
}
