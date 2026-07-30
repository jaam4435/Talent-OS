import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type {
  AgentId,
  AgentMemoryEntryRow,
  AgentMemoryScope,
  AgentMessageRole,
  AgentMessageRow,
  AgentSessionRow,
  AgentSessionStatus,
  CreateAgentSessionInput,
} from '@/modules/agents/types'
import type { Json } from '@/modules/core/types/database'

function mapSessionRow(row: Record<string, unknown>): AgentSessionRow {
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    agent_id: row.agent_id as AgentId,
    user_id: row.user_id as string | null,
    entity_type: row.entity_type as string | null,
    entity_id: row.entity_id as string | null,
    status: row.status as AgentSessionStatus,
    context: (row.context as Record<string, unknown>) ?? {},
    correlation_id: row.correlation_id as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    completed_at: row.completed_at as string | null,
  }
}

function mapMemoryRow(row: Record<string, unknown>): AgentMemoryEntryRow {
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    agent_id: row.agent_id as AgentId,
    session_id: row.session_id as string | null,
    scope: row.scope as AgentMemoryScope,
    entity_type: row.entity_type as string | null,
    entity_id: row.entity_id as string | null,
    memory_key: row.memory_key as string,
    content: row.content as string,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    expires_at: row.expires_at as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

function mapMessageRow(row: Record<string, unknown>): AgentMessageRow {
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    session_id: row.session_id as string,
    agent_id: row.agent_id as AgentId,
    role: row.role as AgentMessageRole,
    content: row.content as string,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
  }
}

export class AgentSessionRepository extends BaseRepository {
  async create(tenantId: string, input: CreateAgentSessionInput): Promise<string> {
    const { data, error } = await this.ctx.supabase
      .from('agent_sessions')
      .insert({
        tenant_id: tenantId,
        agent_id: input.agentId,
        user_id: input.userId ?? null,
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
        correlation_id: input.correlationId ?? null,
        context: (input.context ?? { turnCount: 0 }) as Json,
      })
      .select('id')
      .single()

    this.throwIfError(error)
    if (!data?.id) this.notFound('Agent session')
    return data.id
  }

  async findById(sessionId: string, tenantId: string): Promise<AgentSessionRow | null> {
    const { data } = await this.ctx.supabase
      .from('agent_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    return data ? mapSessionRow(data) : null
  }

  async updateStatus(
    sessionId: string,
    tenantId: string,
    status: AgentSessionStatus
  ): Promise<void> {
    const patch: Record<string, unknown> = { status }
    if (status === 'completed' || status === 'failed') {
      patch.completed_at = new Date().toISOString()
    }

    const { error } = await this.ctx.supabase
      .from('agent_sessions')
      .update(patch as never)
      .eq('id', sessionId)
      .eq('tenant_id', tenantId)

    this.throwIfError(error)
  }

  async mergeContext(
    sessionId: string,
    tenantId: string,
    contextPatch: Record<string, unknown>
  ): Promise<void> {
    const session = await this.findById(sessionId, tenantId)
    if (!session) this.notFound('Agent session')

    const { error } = await this.ctx.supabase
      .from('agent_sessions')
      .update({ context: { ...session.context, ...contextPatch } as Json } as never)
      .eq('id', sessionId)
      .eq('tenant_id', tenantId)

    this.throwIfError(error)
  }
}

export class AgentMessageRepository extends BaseRepository {
  async listBySession(
    sessionId: string,
    tenantId: string,
    limit = 50
  ): Promise<AgentMessageRow[]> {
    const { data, error } = await this.ctx.supabase
      .from('agent_messages')
      .select('*')
      .eq('session_id', sessionId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })
      .limit(limit)

    this.throwIfError(error)
    return (data ?? []).map(mapMessageRow)
  }

  async append(params: {
    tenantId: string
    sessionId: string
    agentId: AgentId
    role: AgentMessageRole
    content: string
    metadata?: Record<string, unknown>
  }): Promise<string> {
    const { data, error } = await this.ctx.supabase
      .from('agent_messages')
      .insert({
        tenant_id: params.tenantId,
        session_id: params.sessionId,
        agent_id: params.agentId,
        role: params.role,
        content: params.content,
        metadata: (params.metadata ?? {}) as Json,
      })
      .select('id')
      .single()

    this.throwIfError(error)
    if (!data?.id) this.notFound('Agent message')
    return data.id
  }
}

export class AgentMemoryRepository extends BaseRepository {
  async list(params: {
    tenantId: string
    agentId: AgentId
    sessionId?: string
    entityType?: string
    entityId?: string
  }): Promise<AgentMemoryEntryRow[]> {
    let query = this.ctx.supabase
      .from('agent_memory_entries')
      .select('*')
      .eq('tenant_id', params.tenantId)
      .eq('agent_id', params.agentId)
      .order('created_at', { ascending: false })

    if (params.sessionId) {
      query = query.or(`session_id.eq.${params.sessionId},scope.eq.tenant,scope.eq.entity`)
    }

    const { data, error } = await query
    this.throwIfError(error)
    return (data ?? []).map(mapMemoryRow)
  }

  async upsert(params: {
    tenantId: string
    agentId: AgentId
    sessionId?: string
    scope: AgentMemoryScope
    entityType?: string
    entityId?: string
    memoryKey: string
    content: string
    metadata?: Record<string, unknown>
    expiresAt?: string | null
  }): Promise<string> {
    const { data, error } = await this.ctx.supabase
      .from('agent_memory_entries')
      .insert({
        tenant_id: params.tenantId,
        agent_id: params.agentId,
        session_id: params.sessionId ?? null,
        scope: params.scope,
        entity_type: params.entityType ?? null,
        entity_id: params.entityId ?? null,
        memory_key: params.memoryKey,
        content: params.content,
        metadata: (params.metadata ?? {}) as Json,
        expires_at: params.expiresAt ?? null,
      })
      .select('id')
      .single()

    this.throwIfError(error)
    if (!data?.id) this.notFound('Agent memory entry')
    return data.id
  }

  async deleteByScope(params: {
    tenantId: string
    agentId: AgentId
    sessionId?: string
    entityType?: string
    entityId?: string
  }): Promise<void> {
    let query = this.ctx.supabase
      .from('agent_memory_entries')
      .delete()
      .eq('tenant_id', params.tenantId)
      .eq('agent_id', params.agentId)

    if (params.sessionId) query = query.eq('session_id', params.sessionId)
    if (params.entityType) query = query.eq('entity_type', params.entityType)
    if (params.entityId) query = query.eq('entity_id', params.entityId)

    const { error } = await query
    this.throwIfError(error)
  }
}
