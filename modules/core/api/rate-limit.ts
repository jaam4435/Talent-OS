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
  ai: { maxRequests: 30, windowMs: 60_000 },
  webhook: { maxRequests: 300, windowMs: 60_000 },
  cron: { maxRequests: 10, windowMs: 60_000 },
  search: { maxRequests: 60, windowMs: 60_000 },
}

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
}

export function checkRateLimit(
  key: string,
  category: RateLimitCategory = 'default'
): RateLimitResult {
  const config = RATE_LIMITS[category]
  const now = Date.now()
  const bucketKey = `${category}:${key}`
  const existing = buckets.get(bucketKey)

  if (!existing || now >= existing.resetAt) {
    const resetAt = now + config.windowMs
    buckets.set(bucketKey, { count: 1, resetAt })
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetAt,
    }
  }

  if (existing.count >= config.maxRequests) {
    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetAt: existing.resetAt,
    }
  }

  existing.count += 1
  return {
    allowed: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - existing.count,
    resetAt: existing.resetAt,
  }
}

export function rateLimitKey(ctx: { tenantId?: string | null; userId?: string | null; ip?: string }) {
  return ctx.tenantId && ctx.userId
    ? `${ctx.tenantId}:${ctx.userId}`
    : (ctx.ip ?? 'anonymous')
}

/** Reset buckets — for testing. */
export function resetRateLimits(): void {
  buckets.clear()
}
