import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { AssignmentRequirement } from '@/modules/assignment/types'

export class AssignmentRequirementRepository extends BaseRepository {
  async create(input: {
    tenant_id: string
    allocation_id: string
    required_skills: string[]
    min_hours?: number | null
    description?: string | null
  }): Promise<AssignmentRequirement> {
    const { data, error } = await this.ctx.supabase.from('assignment_requirements').insert(input).select('*').single()
    this.throwIfError(error)
    if (!data) this.notFound('Requirement')
    return this.mapRow(data)
  }

  async listByAllocation(allocationId: string, tenantId: string): Promise<AssignmentRequirement[]> {
    const { data, error } = await this.ctx.supabase
      .from('assignment_requirements')
      .select('*')
      .eq('allocation_id', allocationId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
    this.throwIfError(error)
    return (data ?? []).map((r) => this.mapRow(r))
  }

  async update(id: string, tenantId: string, patch: Record<string, unknown>): Promise<AssignmentRequirement> {
    const { data, error } = await this.ctx.supabase
      .from('assignment_requirements')
      .update(patch as never)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('*')
      .single()
    this.throwIfError(error)
    if (!data) this.notFound('Requirement')
    return this.mapRow(data)
  }

  private mapRow(row: Record<string, unknown>): AssignmentRequirement {
    return {
      id: row.id as string,
      allocationId: row.allocation_id as string,
      requiredSkills: (row.required_skills as string[]) ?? [],
      minHours: row.min_hours != null ? Number(row.min_hours) : null,
      description: (row.description as string | null) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
