/**
 * In-memory fallback for dev/test when Upstash Redis is not configured.
 * Not used in production (assertRedisConfigured enforces Upstash).
 */
export class MemoryStore {
  private readonly strings = new Map<string, { value: string; expiresAt?: number }>()
  private readonly counters = new Map<string, { count: number; expiresAt: number }>()

  async get(key: string): Promise<string | null> {
    const entry = this.strings.get(key)
    if (!entry) return null
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.strings.delete(key)
      return null
    }
    return entry.value
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.strings.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    })
  }

  async del(key: string): Promise<void> {
    this.strings.delete(key)
    this.counters.delete(key)
  }

  async incr(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
    const now = Date.now()
    const existing = this.counters.get(key)
    if (!existing || now >= existing.expiresAt) {
      const resetAt = now + windowMs
      this.counters.set(key, { count: 1, expiresAt: resetAt })
      return { count: 1, resetAt }
    }
    existing.count += 1
    return { count: existing.count, resetAt: existing.expiresAt }
  }

  async keysByPrefix(prefix: string): Promise<string[]> {
    return [...this.strings.keys(), ...this.counters.keys()].filter((k) => k.startsWith(prefix))
  }

  clear(): void {
    this.strings.clear()
    this.counters.clear()
  }
}

export const memoryStore = new MemoryStore()

export function resetMemoryStore(): void {
  memoryStore.clear()
}
