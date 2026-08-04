import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Json } from '@/modules/core/types/database'
import { toPaginatedResult, type PaginatedResult } from '@/lib/repositories/base/types'
import type { CrmAuditEntry } from '@/modules/crm/types'

export interface CrmAuditInput {
  tenant_id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string
  before_state?: Record<string, unknown> | null
  after_state?: Record<string, unknown> | null
  metadata?: Record<string, unknown>
}

export class CrmAuditRepository extends BaseRepository {
  async record(input: CrmAuditInput): Promise<void> {
    const { error } = await this.ctx.supabase.from('crm_audit_logs').insert({
      tenant_id: input.tenant_id,
      actor_id: input.actor_id,
      action: input.action,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      before_state: (input.before_state ?? null) as Json,
      after_state: (input.after_state ?? null) as Json,
      metadata: (input.metadata ?? {}) as Json,
    })
    this.throwIfError(error)
  }

  async list(
    tenantId: string,
    options: { page?: number; limit?: number; action?: string; entityType?: string }
  ): Promise<PaginatedResult<CrmAuditEntry>> {
    const { limit, offset, page } = this.paginate(options)
    let query = this.ctx.supabase
      .from('crm_audit_logs')
      .select(
        'id, action, entity_type, entity_id, actor_id, before_state, after_state, metadata, created_at',
        { count: 'exact' }
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (options.action) query = query.eq('action', options.action)
    if (options.entityType) query = query.eq('entity_type', options.entityType)

    const { data, error, count } = await query.range(offset, offset + limit - 1)
    this.throwIfError(error)

    return toPaginatedResult(
      (data ?? []).map((row) => ({
        id: row.id,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        actorId: row.actor_id,
        beforeState: (row.before_state as Record<string, unknown> | null) ?? null,
        afterState: (row.after_state as Record<string, unknown> | null) ?? null,
        metadata: (row.metadata as Record<string, unknown>) ?? {},
        createdAt: row.created_at,
      })),
      { limit, page },
      count ?? undefined
    )
  }
}
