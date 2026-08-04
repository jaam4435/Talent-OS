import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Json } from '@/modules/core/types/database'
import type { AssignmentHistoryEntry } from '@/modules/assignment/types'

export class AssignmentHistoryRepository extends BaseRepository {
  async record(input: {
    tenant_id: string
    allocation_id: string
    action: string
    actor_id: string | null
    before_state?: Record<string, unknown> | null
    after_state?: Record<string, unknown> | null
  }): Promise<AssignmentHistoryEntry> {
    const { data, error } = await this.ctx.supabase
      .from('assignment_history')
      .insert({
        ...input,
        before_state: (input.before_state ?? null) as Json,
        after_state: (input.after_state ?? null) as Json,
      })
      .select('*')
      .single()
    this.throwIfError(error)
    if (!data) this.notFound('History entry')
    return this.mapRow(data)
  }

  async listByAllocation(allocationId: string, tenantId: string): Promise<AssignmentHistoryEntry[]> {
    const { data, error } = await this.ctx.supabase
      .from('assignment_history')
      .select('*')
      .eq('allocation_id', allocationId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    this.throwIfError(error)
    return (data ?? []).map((r) => this.mapRow(r))
  }

  private mapRow(row: Record<string, unknown>): AssignmentHistoryEntry {
    return {
      id: row.id as string,
      allocationId: row.allocation_id as string,
      action: row.action as string,
      actorId: (row.actor_id as string | null) ?? null,
      beforeState: (row.before_state as Record<string, unknown> | null) ?? null,
      afterState: (row.after_state as Record<string, unknown> | null) ?? null,
      createdAt: row.created_at as string,
    }
  }
}
