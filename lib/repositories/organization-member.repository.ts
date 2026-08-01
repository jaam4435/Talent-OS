import { BaseRepository } from '@/lib/repositories/base/base.repository'
import { toPaginatedResult, type PaginatedResult } from '@/lib/repositories/base/types'
import type { OrganizationMember } from '@/modules/organization/types'
import type { MemberStatus, UserRole } from '@/modules/core/types/enums'

type MemberRow = {
  id: string
  user_id: string
  role: string
  status: string
  joined_at: string | null
  invited_at: string | null
  profiles: { email: string; full_name: string | null } | { email: string; full_name: string | null }[] | null
}

export class OrganizationMemberRepository extends BaseRepository {
  async findById(id: string, tenantId: string): Promise<OrganizationMember | null> {
    const { data, error } = await this.ctx.supabase
      .from('tenant_members')
      .select('id, user_id, role, status, joined_at, invited_at')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    this.throwIfError(error)
    if (!data) return null

    const profile = await this.loadProfile(data.user_id)
    return this.mapRow({ ...data, profiles: profile })
  }

  async list(
    tenantId: string,
    options: { page?: number; limit?: number; q?: string; status?: string; role?: string }
  ): Promise<PaginatedResult<OrganizationMember>> {
    const { limit, offset, page } = this.paginate(options)
    let query = this.ctx.supabase
      .from('tenant_members')
      .select('id, user_id, role, status, joined_at, invited_at', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('joined_at', { ascending: true })

    if (options.status) query = query.eq('status', options.status as MemberStatus)
    if (options.role) query = query.eq('role', options.role as UserRole)

    const { data, error, count } = await query.range(offset, offset + limit - 1)
    this.throwIfError(error)

    const rows = data ?? []
    const userIds = [...new Set(rows.map((row) => row.user_id))]
    const profiles = await this.loadProfiles(userIds)

    let members = rows.map((row) =>
      this.mapRow({
        ...row,
        profiles: profiles.get(row.user_id) ?? null,
      })
    )

    if (options.q?.trim()) {
      const needle = options.q.trim().toLowerCase()
      members = members.filter(
        (member) =>
          member.email.toLowerCase().includes(needle) ||
          (member.fullName?.toLowerCase().includes(needle) ?? false)
      )
    }

    return toPaginatedResult(members, { limit, page }, count ?? undefined)
  }

  async updateRole(id: string, tenantId: string, role: UserRole): Promise<OrganizationMember> {
    const { data, error } = await this.ctx.supabase
      .from('tenant_members')
      .update({ role })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('id, user_id, role, status, joined_at, invited_at')
      .single()

    this.throwIfError(error)
    if (!data) this.notFound('Member')
    this.invalidateTable('tenant_members')
    const profile = await this.loadProfile(data.user_id)
    return this.mapRow({ ...data, profiles: profile })
  }

  async updateStatus(id: string, tenantId: string, status: MemberStatus): Promise<OrganizationMember> {
    const { data, error } = await this.ctx.supabase
      .from('tenant_members')
      .update({ status })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('id, user_id, role, status, joined_at, invited_at')
      .single()

    this.throwIfError(error)
    if (!data) this.notFound('Member')
    this.invalidateTable('tenant_members')
    const profile = await this.loadProfile(data.user_id)
    return this.mapRow({ ...data, profiles: profile })
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('tenant_members')
      .update({ deleted_at: new Date().toISOString(), status: 'suspended' })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    this.throwIfError(error)
    this.invalidateTable('tenant_members')
  }

  async countAdmins(tenantId: string, excludeMemberId?: string): Promise<number> {
    let query = this.ctx.supabase
      .from('tenant_members')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('role', 'admin')
      .eq('status', 'active')
      .is('deleted_at', null)

    if (excludeMemberId) {
      query = query.neq('id', excludeMemberId)
    }

    const { count } = await query
    return count ?? 0
  }

  private async loadProfile(userId: string) {
    const { data } = await this.ctx.supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .maybeSingle()
    return data
  }

  private async loadProfiles(userIds: string[]) {
    const map = new Map<string, { email: string; full_name: string | null }>()
    if (!userIds.length) return map

    const { data } = await this.ctx.supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds)

    for (const profile of data ?? []) {
      map.set(profile.id, { email: profile.email, full_name: profile.full_name })
    }
    return map
  }

  private mapRow(row: MemberRow): OrganizationMember {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return {
      id: row.id,
      userId: row.user_id,
      email: profile?.email ?? '',
      fullName: profile?.full_name ?? null,
      role: row.role as UserRole,
      status: row.status as MemberStatus,
      joinedAt: row.joined_at,
      invitedAt: row.invited_at,
    }
  }
}
