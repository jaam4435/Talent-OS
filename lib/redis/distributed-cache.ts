import { getRedisClient } from '@/lib/redis/client'
import { memoryStore } from '@/lib/redis/memory-store'

const CACHE_PREFIX = 'cache:'

export class DistributedCache {
  async get<T>(key: string): Promise<T | undefined> {
    const redis = getRedisClient()
    const fullKey = `${CACHE_PREFIX}${key}`

    if (redis) {
      const raw = await redis.get<string>(fullKey)
      if (raw === null || raw === undefined) return undefined
      try {
        return JSON.parse(typeof raw === 'string' ? raw : String(raw)) as T
      } catch {
        return undefined
      }
    }

    const raw = await memoryStore.get(fullKey)
    if (!raw) return undefined
    try {
      return JSON.parse(raw) as T
    } catch {
      return undefined
    }
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    const redis = getRedisClient()
    const fullKey = `${CACHE_PREFIX}${key}`
    const serialized = JSON.stringify(value)
    const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000))

    if (redis) {
      await redis.set(fullKey, serialized, { ex: ttlSeconds })
      return
    }

    await memoryStore.set(fullKey, serialized, ttlSeconds)
  }

  async invalidate(prefix: string): Promise<void> {
    const redis = getRedisClient()
    const fullPrefix = `${CACHE_PREFIX}${prefix}`

    if (redis) {
      const keys = await redis.keys(`${fullPrefix}*`)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
      return
    }

    const keys = await memoryStore.keysByPrefix(fullPrefix)
    await Promise.all(keys.map((k) => memoryStore.del(k)))
  }

  clear(): void {
    memoryStore.clear()
  }
}

export const globalRepositoryCache = new DistributedCache()

export function resetDistributedCache(): void {
  globalRepositoryCache.clear()
}
