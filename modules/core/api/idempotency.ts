import { createAdminClient } from '@/modules/core/utils/supabase/admin'
import type { Json } from '@/modules/core/types/database'
import { memoryStore } from '@/lib/redis/memory-store'

const TTL_MS = 24 * 60 * 60 * 1000
const IDEM_PREFIX = 'idem:'

export interface IdempotencyRecord {
  status: number
  body: unknown
  createdAt: number
}

function usePostgresStore(): boolean {
  return Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.VITEST !== 'true' &&
      process.env.IDEMPOTENCY_STORE !== 'memory'
  )
}

export async function getIdempotentResponse(key: string): Promise<IdempotencyRecord | null> {
  if (!usePostgresStore()) {
    return getMemoryIdempotentResponse(key)
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('api_idempotency_responses')
      .select('status_code, response_body, created_at, expires_at')
      .eq('idempotency_key', key)
      .maybeSingle()

    if (error || !data) return null
    if (new Date(data.expires_at).getTime() < Date.now()) {
      await supabase.from('api_idempotency_responses').delete().eq('idempotency_key', key)
      return null
    }

    return {
      status: data.status_code,
      body: data.response_body,
      createdAt: new Date(data.created_at).getTime(),
    }
  } catch {
    return getMemoryIdempotentResponse(key)
  }
}

export async function storeIdempotentResponse(
  key: string,
  status: number,
  body: unknown,
  meta?: { tenantId?: string | null; method?: string; path?: string }
): Promise<void> {
  if (!usePostgresStore()) {
    await storeMemoryIdempotentResponse(key, status, body)
    return
  }

  try {
    const supabase = createAdminClient()
    const expiresAt = new Date(Date.now() + TTL_MS).toISOString()
    const { error } = await supabase.from('api_idempotency_responses').upsert(
      {
        idempotency_key: key,
        tenant_id: meta?.tenantId ?? null,
        http_method: meta?.method ?? 'POST',
        path: meta?.path ?? '/',
        status_code: status,
        response_body: body as Json,
        expires_at: expiresAt,
      },
      { onConflict: 'idempotency_key' }
    )
    if (error) {
      await storeMemoryIdempotentResponse(key, status, body)
    }
  } catch {
    await storeMemoryIdempotentResponse(key, status, body)
  }
}

async function getMemoryIdempotentResponse(key: string): Promise<IdempotencyRecord | null> {
  const raw = await memoryStore.get(`${IDEM_PREFIX}${key}`)
  if (!raw) return null
  try {
    const record = JSON.parse(raw) as IdempotencyRecord
    if (Date.now() - record.createdAt > TTL_MS) {
      await memoryStore.del(`${IDEM_PREFIX}${key}`)
      return null
    }
    return record
  } catch {
    return null
  }
}

async function storeMemoryIdempotentResponse(
  key: string,
  status: number,
  body: unknown
): Promise<void> {
  const record: IdempotencyRecord = { status, body, createdAt: Date.now() }
  await memoryStore.set(`${IDEM_PREFIX}${key}`, JSON.stringify(record), TTL_MS / 1000)
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
  memoryStore.clear()
}
