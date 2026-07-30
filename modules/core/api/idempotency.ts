/** In-memory idempotency store for API mutations. Production should use Redis/DB. */
interface IdempotencyRecord {
  status: number
  body: unknown
  createdAt: number
}

const store = new Map<string, IdempotencyRecord>()
const TTL_MS = 24 * 60 * 60 * 1000

function cleanupExpired(): void {
  const now = Date.now()
  for (const [key, record] of store.entries()) {
    if (now - record.createdAt > TTL_MS) store.delete(key)
  }
}

export function getIdempotentResponse(key: string): IdempotencyRecord | null {
  cleanupExpired()
  const record = store.get(key)
  if (!record) return null
  if (Date.now() - record.createdAt > TTL_MS) {
    store.delete(key)
    return null
  }
  return record
}

export function storeIdempotentResponse(key: string, status: number, body: unknown): void {
  store.set(key, { status, body, createdAt: Date.now() })
}

export function buildIdempotencyKey(
  tenantId: string | null,
  key: string | null,
  method: string,
  path: string
): string | null {
  if (!key) return null
  return `${tenantId ?? 'global'}:${method}:${path}:${key}`
}

export function resetIdempotencyStore(): void {
  store.clear()
}
