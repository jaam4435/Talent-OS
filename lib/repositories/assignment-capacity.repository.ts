import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { AssignmentCapacity } from '@/modules/assignment/types'

export class AssignmentCapacityRepository extends BaseRepository {
  async create(input: {
    tenant_id: string
    freelancer_id: string
    weekly_hours?: number
    max_concurrent_assignments?: number
    effective_from?: string
    effective_to?: string | null
  }): Promise<AssignmentCapacity> {
    const { data, error } = await this.ctx.supabase.from('assignment_capacity').insert(input).select('*').single()
    this.throwIfError(error)
    if (!data) this.notFound('Capacity')
    return this.mapRow(data)
  }

  async findById(id: string, tenantId: string): Promise<AssignmentCapacity | null> {
    const { data, error } = await this.ctx.supabase
      .from('assignment_capacity')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()
    this.throwIfError(error)
    return data ? this.mapRow(data) : null
  }

  async listByFreelancer(freelancerId: string, tenantId: string): Promise<AssignmentCapacity[]> {
    const { data, error } = await this.ctx.supabase
      .from('assignment_capacity')
      .select('*')
      .eq('freelancer_id', freelancerId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('effective_from', { ascending: false })
    this.throwIfError(error)
    return (data ?? []).map((r) => this.mapRow(r))
  }

  async update(id: string, tenantId: string, patch: Record<string, unknown>): Promise<AssignmentCapacity> {
    const { data, error } = await this.ctx.supabase
      .from('assignment_capacity')
      .update(patch as never)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('*')
      .single()
    this.throwIfError(error)
    if (!data) this.notFound('Capacity')
    return this.mapRow(data)
  }

  private mapRow(row: Record<string, unknown>): AssignmentCapacity {
    return {
      id: row.id as string,
      freelancerId: row.freelancer_id as string,
      weeklyHours: Number(row.weekly_hours),
      maxConcurrentAssignments: row.max_concurrent_assignments as number,
      effectiveFrom: row.effective_from as string,
      effectiveTo: (row.effective_to as string | null) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
