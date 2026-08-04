import { AiCircuitOpenError } from '@/lib/ai/errors'
import { memoryStore } from '@/lib/redis/memory-store'
import type { ProviderId } from '@/lib/ai/types'

type CircuitState = 'closed' | 'open' | 'half_open'

interface CircuitRecord {
  state: CircuitState
  failures: number
  openedAt?: number
}

const WINDOW_MS = Number(process.env.AI_CIRCUIT_BREAKER_WINDOW_MS ?? 60_000)
const OPEN_MS = Number(process.env.AI_CIRCUIT_BREAKER_OPEN_MS ?? 30_000)

function failureThreshold(): number {
  return Number(process.env.AI_CIRCUIT_BREAKER_THRESHOLD ?? 5)
}

function key(providerId: ProviderId): string {
  return `ai:cb:${providerId}`
}

function isEnabled(): boolean {
  if (process.env.AI_CIRCUIT_BREAKER_ENABLED === 'false') return false
  return process.env.AI_CIRCUIT_BREAKER_ENABLED !== 'false'
}

async function read(providerId: ProviderId): Promise<CircuitRecord> {
  const raw = await memoryStore.get(key(providerId))
  if (!raw) return { state: 'closed', failures: 0 }
  try {
    return JSON.parse(raw) as CircuitRecord
  } catch {
    return { state: 'closed', failures: 0 }
  }
}

async function write(providerId: ProviderId, record: CircuitRecord): Promise<void> {
  await memoryStore.set(key(providerId), JSON.stringify(record), Math.ceil(WINDOW_MS / 1000))
}

export async function assertCircuitClosed(providerId: ProviderId): Promise<void> {
  if (!isEnabled()) return

  const record = await read(providerId)
  if (record.state === 'open') {
    const elapsed = Date.now() - (record.openedAt ?? 0)
    if (elapsed >= OPEN_MS) {
      await write(providerId, { state: 'half_open', failures: record.failures })
      return
    }
    throw new AiCircuitOpenError(providerId)
  }
}

export async function recordCircuitSuccess(providerId: ProviderId): Promise<void> {
  if (!isEnabled()) return
  await write(providerId, { state: 'closed', failures: 0 })
}

export async function recordCircuitFailure(providerId: ProviderId): Promise<void> {
  if (!isEnabled()) return

  const current = await read(providerId)
  const failures = current.failures + 1

  if (failures >= failureThreshold() || current.state === 'half_open') {
    await write(providerId, { state: 'open', failures, openedAt: Date.now() })
    return
  }

  await write(providerId, { state: 'closed', failures })
}

export async function getCircuitState(providerId: ProviderId): Promise<CircuitState> {
  return (await read(providerId)).state
}
