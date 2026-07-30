import type { AiMessage } from '@/lib/ai/types'

export type MemoryScope = 'session' | 'entity' | 'tenant'

export interface MemoryEntry {
  key: string
  content: string
  scope: MemoryScope
  tenantId?: string
  sessionId?: string
  entityType?: string
  entityId?: string
  createdAt: string
  expiresAt?: string | null
}

export interface MemoryWriteInput {
  key: string
  content: string
  scope: MemoryScope
  tenantId?: string
  sessionId?: string
  entityType?: string
  entityId?: string
  ttlHours?: number
}

export interface MemoryReadInput {
  tenantId?: string
  sessionId?: string
  entityType?: string
  entityId?: string
  scope?: MemoryScope
  limit?: number
}

/** In-process AI memory for gateway context injection. Production persistence via AgentMemoryStore. */
export class PlatformMemoryStore {
  private readonly entries = new Map<string, MemoryEntry>()

  private buildKey(input: MemoryWriteInput): string {
    return [
      input.scope,
      input.tenantId ?? '',
      input.sessionId ?? '',
      input.entityType ?? '',
      input.entityId ?? '',
      input.key,
    ].join(':')
  }

  write(input: MemoryWriteInput): MemoryEntry {
    const entry: MemoryEntry = {
      key: input.key,
      content: input.content,
      scope: input.scope,
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      entityType: input.entityType,
      entityId: input.entityId,
      createdAt: new Date().toISOString(),
      expiresAt: input.ttlHours
        ? new Date(Date.now() + input.ttlHours * 3600_000).toISOString()
        : null,
    }
    this.entries.set(this.buildKey(input), entry)
    return entry
  }

  read(input: MemoryReadInput): MemoryEntry[] {
    const now = Date.now()
    const limit = input.limit ?? 20

    return [...this.entries.values()]
      .filter((entry) => {
        if (entry.expiresAt && new Date(entry.expiresAt).getTime() <= now) return false
        if (input.tenantId && entry.tenantId !== input.tenantId) return false
        if (input.sessionId && entry.sessionId !== input.sessionId) return false
        if (input.entityType && entry.entityType !== input.entityType) return false
        if (input.entityId && entry.entityId !== input.entityId) return false
        if (input.scope && entry.scope !== input.scope) return false
        return true
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
  }

  clear(input: MemoryReadInput): void {
    for (const [key, entry] of this.entries) {
      if (input.tenantId && entry.tenantId !== input.tenantId) continue
      if (input.sessionId && entry.sessionId !== input.sessionId) continue
      if (input.entityType && entry.entityType !== input.entityType) continue
      if (input.entityId && entry.entityId !== input.entityId) continue
      this.entries.delete(key)
    }
  }

  /** Inject memory entries as a system preamble. */
  toMessages(entries: MemoryEntry[]): AiMessage[] {
    if (!entries.length) return []
    const block = entries
      .map((e) => `[${e.key}] ${e.content}`)
      .join('\n')
    return [{ role: 'system', content: `Relevant context from memory:\n${block}` }]
  }
}

export const globalPlatformMemory = new PlatformMemoryStore()
