import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { AssignmentSchedule } from '@/modules/assignment/types'

export class AssignmentScheduleRepository extends BaseRepository {
  async create(input: {
    tenant_id: string
    allocation_id: string
    starts_at: string
    ends_at: string
    hours?: number
    notes?: string | null
  }): Promise<AssignmentSchedule> {
    const { data, error } = await this.ctx.supabase.from('assignment_schedules').insert(input).select('*').single()
    this.throwIfError(error)
    if (!data) this.notFound('Schedule')
    return this.mapRow(data)
  }

  async listByAllocation(allocationId: string, tenantId: string): Promise<AssignmentSchedule[]> {
    const { data, error } = await this.ctx.supabase
      .from('assignment_schedules')
      .select('*')
      .eq('allocation_id', allocationId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('starts_at')
    this.throwIfError(error)
    return (data ?? []).map((r) => this.mapRow(r))
  }

  async update(id: string, tenantId: string, patch: Record<string, unknown>): Promise<AssignmentSchedule> {
    const { data, error } = await this.ctx.supabase
      .from('assignment_schedules')
      .update(patch as never)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('*')
      .single()
    this.throwIfError(error)
    if (!data) this.notFound('Schedule')
    return this.mapRow(data)
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('assignment_schedules')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
    this.throwIfError(error)
  }

  private mapRow(row: Record<string, unknown>): AssignmentSchedule {
    return {
      id: row.id as string,
      allocationId: row.allocation_id as string,
      startsAt: row.starts_at as string,
      endsAt: row.ends_at as string,
      hours: Number(row.hours),
      notes: (row.notes as string | null) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
