import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Json } from '@/modules/core/types/database'
import { toPaginatedResult, type PaginatedResult } from '@/lib/repositories/base/types'
import type { WhatsAppMemoryEntry } from '@/modules/whatsapp-platform/types'

export class WhatsappMemoryRepository extends BaseRepository {
  async append(input: {
    tenant_id: string
    freelancer_id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    intent?: string | null
    metadata?: Record<string, unknown>
  }): Promise<WhatsAppMemoryEntry> {
    const { data, error } = await this.ctx.supabase
      .from('whatsapp_memory_entries')
      .insert({
        tenant_id: input.tenant_id,
        freelancer_id: input.freelancer_id,
        role: input.role,
        content: input.content,
        intent: input.intent ?? null,
        metadata: (input.metadata ?? {}) as Json,
      })
      .select('*')
      .single()

    this.throwIfError(error)
    if (!data) this.notFound('WhatsApp memory entry')
    return this.mapRow(data)
  }

  async list(
    tenantId: string,
    freelancerId: string,
    options: { page?: number; limit?: number }
  ): Promise<PaginatedResult<WhatsAppMemoryEntry>> {
    const { limit, offset, page } = this.paginate(options)

    const { data, error, count } = await this.ctx.supabase
      .from('whatsapp_memory_entries')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('freelancer_id', freelancerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    this.throwIfError(error)

    return toPaginatedResult(
      (data ?? []).map((row) => this.mapRow(row)),
      { limit, page },
      count ?? undefined
    )
  }

  async recent(tenantId: string, freelancerId: string, limit = 10): Promise<WhatsAppMemoryEntry[]> {
    const { data, error } = await this.ctx.supabase
      .from('whatsapp_memory_entries')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('freelancer_id', freelancerId)
      .order('created_at', { ascending: false })
      .limit(limit)

    this.throwIfError(error)
    return (data ?? []).map((row) => this.mapRow(row)).reverse()
  }

  private mapRow(row: {
    id: string
    tenant_id: string
    freelancer_id: string
    role: string
    content: string
    intent: string | null
    metadata: Json
    created_at: string
  }): WhatsAppMemoryEntry {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      freelancerId: row.freelancer_id,
      role: row.role as WhatsAppMemoryEntry['role'],
      content: row.content,
      intent: row.intent,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: row.created_at,
    }
  }
}
