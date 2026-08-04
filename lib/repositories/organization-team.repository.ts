import { BaseRepository } from '@/lib/repositories/base/base.repository'
import { toPaginatedResult, type PaginatedResult } from '@/lib/repositories/base/types'
import type { OrganizationTeam } from '@/modules/organization/types'

export interface CreateTeamInput {
  tenant_id: string
  name: string
  slug: string
  description?: string | null
  department_id?: string | null
}

export class OrganizationTeamRepository extends BaseRepository {
  async create(input: CreateTeamInput): Promise<OrganizationTeam> {
    const { data, error } = await this.ctx.supabase
      .from('org_teams')
      .insert(input)
      .select('id, name, slug, description, department_id, created_at, updated_at')
      .single()

    if (error?.code === '23505') {
      throw this.mapError(error, 'A team with this slug already exists.')
    }
    this.throwIfError(error)
    this.invalidateTable('org_teams')
    if (!data) this.notFound('Team')
    return this.mapRow(data, 0)
  }

  async findById(id: string, tenantId: string): Promise<OrganizationTeam | null> {
    const { data, error } = await this.ctx.supabase
      .from('org_teams')
      .select('id, name, slug, description, department_id, created_at, updated_at')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    this.throwIfError(error)
    if (!data) return null

    const memberCount = await this.countMembers(id)
    return this.mapRow(data, memberCount)
  }

  async list(
    tenantId: string,
    options: { page?: number; limit?: number; q?: string; departmentId?: string }
  ): Promise<PaginatedResult<OrganizationTeam>> {
    const { limit, offset, page } = this.paginate(options)
    let query = this.ctx.supabase
      .from('org_teams')
      .select('id, name, slug, description, department_id, created_at, updated_at', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name')

    if (options.q?.trim()) {
      query = query.ilike('name', `%${options.q.trim()}%`)
    }
    if (options.departmentId) {
      query = query.eq('department_id', options.departmentId)
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1)
    this.throwIfError(error)

    const teams = await Promise.all(
      (data ?? []).map(async (row) => this.mapRow(row, await this.countMembers(row.id)))
    )
    return toPaginatedResult(teams, { limit, page }, count ?? undefined)
  }

  async update(
    id: string,
    tenantId: string,
    patch: { name?: string; description?: string | null; department_id?: string | null }
  ): Promise<OrganizationTeam> {
    const { data, error } = await this.ctx.supabase
      .from('org_teams')
      .update(patch)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('id, name, slug, description, department_id, created_at, updated_at')
      .single()

    this.throwIfError(error)
    this.invalidateTable('org_teams')
    if (!data) this.notFound('Team')
    const memberCount = await this.countMembers(id)
    return this.mapRow(data, memberCount)
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('org_teams')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    this.throwIfError(error)
    this.invalidateTable('org_teams')
  }

  async addMember(teamId: string, tenantId: string, memberId: string): Promise<void> {
    const { error } = await this.ctx.supabase.from('org_team_members').insert({
      tenant_id: tenantId,
      team_id: teamId,
      member_id: memberId,
    })

    if (error?.code === '23505') {
      throw this.mapError(error, 'Member is already on this team.')
    }
    this.throwIfError(error)
  }

  async removeMember(teamId: string, tenantId: string, memberId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('org_team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('tenant_id', tenantId)
      .eq('member_id', memberId)

    this.throwIfError(error)
  }

  async listMemberIds(teamId: string, tenantId: string): Promise<string[]> {
    const { data, error } = await this.ctx.supabase
      .from('org_team_members')
      .select('member_id')
      .eq('team_id', teamId)
      .eq('tenant_id', tenantId)

    this.throwIfError(error)
    return (data ?? []).map((row) => row.member_id)
  }

  private async countMembers(teamId: string): Promise<number> {
    const { count } = await this.ctx.supabase
      .from('org_team_members')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamId)
    return count ?? 0
  }

  private mapRow(
    row: {
      id: string
      name: string
      slug: string
      description: string | null
      department_id: string | null
      created_at: string
      updated_at: string
    },
    memberCount: number
  ): OrganizationTeam {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      departmentId: row.department_id,
      memberCount,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}
