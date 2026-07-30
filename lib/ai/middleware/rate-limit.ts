import { AiRateLimitError } from '@/lib/ai/errors'
import type { RateLimitState } from '@/lib/ai/types'

interface BucketEntry {
  timestamps: number[]
}

export class RateLimiter {
  private readonly buckets = new Map<string, BucketEntry>()

  constructor(private readonly requestsPerMinute: number) {}

  check(key = 'global'): RateLimitState {
    const now = Date.now()
    const windowMs = 60_000
    const bucket = this.buckets.get(key) ?? { timestamps: [] }

    bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < windowMs)
    this.buckets.set(key, bucket)

    const remaining = Math.max(0, this.requestsPerMinute - bucket.timestamps.length)
    const resetAt = new Date(now + windowMs)

    return {
      remaining,
      resetAt,
      limited: remaining <= 0,
    }
  }

  consume(key = 'global'): void {
    const state = this.check(key)
    if (state.limited) {
      throw new AiRateLimitError(state.resetAt)
    }

    const bucket = this.buckets.get(key)!
    bucket.timestamps.push(Date.now())
  }
}
