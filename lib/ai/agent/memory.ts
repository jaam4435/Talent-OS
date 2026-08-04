import type { AgentMemoryEntryRow, AgentMemoryPolicy, AgentMemoryScope, AgentId } from '@/modules/agents/types'

export interface AgentMemoryStore {
  read(params: {
    tenantId: string
    agentId: AgentId
    policy: AgentMemoryPolicy
    sessionId?: string
    entityType?: string
    entityId?: string
  }): Promise<AgentMemoryEntryRow[]>

  write(params: {
    tenantId: string
    agentId: AgentId
    sessionId?: string
    scope: AgentMemoryScope
    entityType?: string
    entityId?: string
    memoryKey: string
    content: string
    metadata?: Record<string, unknown>
    ttlHours?: number
  }): Promise<string>

  clear(params: {
    tenantId: string
    agentId: AgentId
    sessionId?: string
    entityType?: string
    entityId?: string
  }): Promise<void>
}

export function filterMemoryByPolicy(
  entries: AgentMemoryEntryRow[],
  policy: AgentMemoryPolicy,
  sessionId?: string,
  entityType?: string,
  entityId?: string
): AgentMemoryEntryRow[] {
  const now = Date.now()
  const active = entries.filter((e) => !e.expires_at || new Date(e.expires_at).getTime() > now)

  switch (policy.scope) {
    case 'session':
      return active
        .filter((e) => e.scope === 'session' && (!sessionId || e.session_id === sessionId))
        .slice(0, policy.maxEntries)
    case 'entity':
      return active
        .filter(
          (e) =>
            (e.scope === 'entity' &&
              entityType &&
              entityId &&
              e.entity_type === entityType &&
              e.entity_id === entityId) ||
            (e.scope === 'session' && sessionId && e.session_id === sessionId)
        )
        .slice(0, policy.maxEntries)
    case 'tenant':
      return active.slice(0, policy.maxEntries)
    default:
      return active.slice(0, policy.maxEntries)
  }
}

export function computeExpiresAt(ttlHours?: number): string | null {
  if (!ttlHours) return null
  return new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString()
}
