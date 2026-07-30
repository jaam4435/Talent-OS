import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Json } from '@/modules/core/types/database'

export interface ActivityLogInput {
  tenant_id: string
  actor_id: string | null
  entity_type: string
  entity_id: string
  action: string
  metadata?: Record<string, unknown>
}

export interface ActivityLogEntry {
  action: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export class ActivityLogRepository extends BaseRepository {
  async create(input: ActivityLogInput): Promise<void> {
    const { error } = await this.ctx.supabase.from('activity_logs').insert({
      ...input,
      metadata: (input.metadata ?? {}) as Json,
    })
    this.throwIfError(error)
  }

  async listByEntity(
    entityType: string,
    entityId: string,
    limit = 10
  ): Promise<ActivityLogEntry[]> {
    const { data, error } = await this.ctx.supabase
      .from('activity_logs')
      .select('action, metadata, created_at')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(limit)

    this.throwIfError(error)
    return (data ?? []) as ActivityLogEntry[]
  }
}
