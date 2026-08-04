import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Json } from '@/modules/core/types/database'
import type { AssignmentConflict, AssignmentConflictSeverity, AssignmentConflictType } from '@/modules/assignment/types'

export class AssignmentConflictRepository extends BaseRepository {
  async record(input: {
    tenant_id: string
    freelancer_id: string
    conflict_type: AssignmentConflictType
    severity: AssignmentConflictSeverity
    allocation_id_a: string
    allocation_id_b?: string | null
    details?: Record<string, unknown>
  }): Promise<AssignmentConflict> {
    const { data, error } = await this.ctx.supabase
      .from('assignment_conflicts')
      .insert({ ...input, details: (input.details ?? {}) as Json })
      .select('*')
      .single()
    this.throwIfError(error)
    if (!data) this.notFound('Conflict')
    return this.mapRow(data)
  }

  async listOpen(tenantId: string, freelancerId?: string): Promise<AssignmentConflict[]> {
    let query = this.ctx.supabase
      .from('assignment_conflicts')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .is('resolved_at', null)
      .order('created_at', { ascending: false })

    if (freelancerId) query = query.eq('freelancer_id', freelancerId)

    const { data, error } = await query
    this.throwIfError(error)
    return (data ?? []).map((r) => this.mapRow(r))
  }

  async resolve(id: string, tenantId: string): Promise<AssignmentConflict> {
    const { data, error } = await this.ctx.supabase
      .from('assignment_conflicts')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('*')
      .single()
    this.throwIfError(error)
    if (!data) this.notFound('Conflict')
    return this.mapRow(data)
  }

  private mapRow(row: Record<string, unknown>): AssignmentConflict {
    return {
      id: row.id as string,
      freelancerId: row.freelancer_id as string,
      conflictType: row.conflict_type as AssignmentConflictType,
      severity: row.severity as AssignmentConflictSeverity,
      allocationIdA: row.allocation_id_a as string,
      allocationIdB: (row.allocation_id_b as string | null) ?? null,
      details: (row.details as Record<string, unknown>) ?? {},
      resolvedAt: (row.resolved_at as string | null) ?? null,
      createdAt: row.created_at as string,
    }
  }
}
