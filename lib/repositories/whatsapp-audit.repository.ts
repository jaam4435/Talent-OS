import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Json } from '@/modules/core/types/database'
import { toPaginatedResult, type PaginatedResult } from '@/lib/repositories/base/types'
import type { WhatsAppAuditEntry } from '@/modules/whatsapp-platform/types'

export interface WhatsAppAuditInput {
  tenant_id: string
  actor_id?: string | null
  freelancer_id?: string | null
  action: string
  entity_type: string
  entity_id: string
  channel?: string
  before_state?: Record<string, unknown> | null
  after_state?: Record<string, unknown> | null
  metadata?: Record<string, unknown>
  wa_message_id?: string | null
}

export class WhatsappAuditRepository extends BaseRepository {
  async record(input: WhatsAppAuditInput): Promise<void> {
    const { error } = await this.ctx.supabase.from('whatsapp_audit_logs').insert({
      tenant_id: input.tenant_id,
      actor_id: input.actor_id ?? null,
      freelancer_id: input.freelancer_id ?? null,
      action: input.action,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      channel: input.channel ?? 'whatsapp',
      before_state: (input.before_state ?? null) as Json,
      after_state: (input.after_state ?? null) as Json,
      metadata: (input.metadata ?? {}) as Json,
      wa_message_id: input.wa_message_id ?? null,
    })
    this.throwIfError(error)
  }

  async list(
    tenantId: string,
    options: {
      page?: number
      limit?: number
      action?: string
      entityType?: string
      freelancerId?: string
    }
  ): Promise<PaginatedResult<WhatsAppAuditEntry>> {
    const { limit, offset, page } = this.paginate(options)

    let query = this.ctx.supabase
      .from('whatsapp_audit_logs')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (options.action) query = query.eq('action', options.action)
    if (options.entityType) query = query.eq('entity_type', options.entityType)
    if (options.freelancerId) query = query.eq('freelancer_id', options.freelancerId)

    const { data, error, count } = await query.range(offset, offset + limit - 1)
    this.throwIfError(error)

    return toPaginatedResult(
      (data ?? []).map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        actorId: row.actor_id,
        freelancerId: row.freelancer_id,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        channel: row.channel,
        beforeState: (row.before_state as Record<string, unknown> | null) ?? null,
        afterState: (row.after_state as Record<string, unknown> | null) ?? null,
        metadata: (row.metadata as Record<string, unknown>) ?? {},
        waMessageId: row.wa_message_id,
        createdAt: row.created_at,
      })),
      { limit, page },
      count ?? undefined
    )
  }
}
