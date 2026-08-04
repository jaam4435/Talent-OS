import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { TalentExperience } from '@/modules/talent/types'

export class TalentExperienceRepository extends BaseRepository {
  async create(input: {
    tenant_id: string
    freelancer_id: string
    company: string
    title: string
    description?: string | null
    starts_on: string
    ends_on?: string | null
    skills?: string[]
    sort_order?: number
  }): Promise<TalentExperience> {
    const { data, error } = await this.ctx.supabase
      .from('talent_experience')
      .insert(input)
      .select('*')
      .single()
    this.throwIfError(error)
    if (!data) this.notFound('Experience')
    return this.mapRow(data)
  }

  async findById(id: string, tenantId: string): Promise<TalentExperience | null> {
    const { data, error } = await this.ctx.supabase
      .from('talent_experience')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()
    this.throwIfError(error)
    return data ? this.mapRow(data) : null
  }

  async listByFreelancer(freelancerId: string, tenantId: string): Promise<TalentExperience[]> {
    const { data, error } = await this.ctx.supabase
      .from('talent_experience')
      .select('*')
      .eq('freelancer_id', freelancerId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('starts_on', { ascending: false })
    this.throwIfError(error)
    return (data ?? []).map((r) => this.mapRow(r))
  }

  async countByFreelancer(freelancerId: string, tenantId: string): Promise<number> {
    const { count, error } = await this.ctx.supabase
      .from('talent_experience')
      .select('id', { count: 'exact', head: true })
      .eq('freelancer_id', freelancerId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
    this.throwIfError(error)
    return count ?? 0
  }

  async update(id: string, tenantId: string, patch: Record<string, unknown>): Promise<TalentExperience> {
    const { data, error } = await this.ctx.supabase
      .from('talent_experience')
      .update(patch as never)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('*')
      .single()
    this.throwIfError(error)
    if (!data) this.notFound('Experience')
    return this.mapRow(data)
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('talent_experience')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
    this.throwIfError(error)
  }

  private mapRow(row: Record<string, unknown>): TalentExperience {
    return {
      id: row.id as string,
      freelancerId: row.freelancer_id as string,
      company: row.company as string,
      title: row.title as string,
      description: (row.description as string | null) ?? null,
      startsOn: row.starts_on as string,
      endsOn: (row.ends_on as string | null) ?? null,
      skills: (row.skills as string[]) ?? [],
      sortOrder: row.sort_order as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
