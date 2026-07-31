import { Ratelimit } from '@upstash/ratelimit'
import { getRedisClient } from '@/lib/redis/client'
import { memoryStore, resetMemoryStore } from '@/lib/redis/memory-store'

/** Rate limit categories aligned with docs/05-api-architecture.md */
export type RateLimitCategory =
  | 'default'
  | 'auth'
  | 'ai'
  | 'webhook'
  | 'cron'
  | 'search'

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

export const RATE_LIMITS: Record<RateLimitCategory, RateLimitConfig> = {
  default: { maxRequests: 120, windowMs: 60_000 },
  auth: { maxRequests: 10, windowMs: 60_000 },
  ai: { maxRequests: 60, windowMs: 60_000 },
  webhook: { maxRequests: 300, windowMs: 60_000 },
  cron: { maxRequests: 10, windowMs: 60_000 },
  search: { maxRequests: 60, windowMs: 60_000 },
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
}

const RATE_LIMIT_PREFIX = 'rl:'

const upstashLimiters = new Map<RateLimitCategory, Ratelimit>()

function getUpstashLimiter(category: RateLimitCategory): Ratelimit | null {
  const redis = getRedisClient()
  if (!redis) return null

  let limiter = upstashLimiters.get(category)
  if (!limiter) {
    const config = RATE_LIMITS[category]
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowMs} ms`),
      prefix: `${RATE_LIMIT_PREFIX}${category}`,
      analytics: false,
    })
    upstashLimiters.set(category, limiter)
  }
  return limiter
}

export async function checkRateLimit(
  key: string,
  category: RateLimitCategory = 'default'
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[category]
  const bucketKey = `${category}:${key}`

  const upstash = getUpstashLimiter(category)
  if (upstash) {
    const result = await upstash.limit(bucketKey)
    return {
      allowed: result.success,
      limit: config.maxRequests,
      remaining: result.remaining,
      resetAt: result.reset,
    }
  }

  const { count, resetAt } = await memoryStore.incr(bucketKey, config.windowMs)
  return {
    allowed: count <= config.maxRequests,
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - count),
    resetAt,
  }
}

export function rateLimitKey(ctx: {
  tenantId?: string | null
  userId?: string | null
  ip?: string
}) {
  return ctx.tenantId && ctx.userId
    ? `${ctx.tenantId}:${ctx.userId}`
    : (ctx.ip ?? 'anonymous')
}

/** Reset rate limit state — for testing. */
export function resetRateLimits(): void {
  upstashLimiters.clear()
  resetMemoryStore()
}
