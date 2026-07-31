import { Redis } from '@upstash/redis'
import { isProduction } from '@/lib/env'

let redisClient: Redis | null | undefined

/** Returns Upstash Redis client, or null when not configured (dev/test fallback). */
export function getRedisClient(): Redis | null {
  if (redisClient !== undefined) return redisClient

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    redisClient = null
    return null
  }

  redisClient = new Redis({ url, token })
  return redisClient
}

/** Requires Redis in production deployments. */
export function assertRedisConfigured(): void {
  if (!isProduction()) return
  if (!getRedisClient()) {
    throw new Error(
      'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production'
    )
  }
}

export function resetRedisClient(): void {
  redisClient = undefined
}
