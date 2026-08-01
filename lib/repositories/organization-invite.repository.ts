import { BaseRepository } from '@/lib/repositories/base/base.repository'
import { toPaginatedResult, type PaginatedResult } from '@/lib/repositories/base/types'
import type { OrganizationInvite } from '@/modules/organization/types'
import type { UserRole } from '@/modules/core/types/enums'

export interface CreateInviteRecordInput {
  tenant_id: string
  email: string
  role: UserRole
  invited_by: string
  token_hash: string
  expires_at: string
  company_id?: string | null
}

export class OrganizationInviteRepository extends BaseRepository {
  async create(input: CreateInviteRecordInput): Promise<{ id: string }> {
    const { data, error } = await this.ctx.supabase
      .from('member_invites')
      .insert(input)
      .select('id')
      .single()

    if (error?.code === '23505') {
      throw this.mapError(error, 'An invite already exists for this email.')
    }
    this.throwIfError(error)
    if (!data?.id) this.notFound('Invite')
    return { id: data.id }
  }

  async list(
    tenantId: string,
    options: { page?: number; limit?: number; q?: string }
  ): Promise<PaginatedResult<OrganizationInvite>> {
    const { limit, offset, page } = this.paginate(options)
    let query = this.ctx.supabase
      .from('member_invites')
      .select('id, email, role, expires_at, created_at', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })

    if (options.q?.trim()) {
      query = query.ilike('email', `%${options.q.trim()}%`)
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1)
    this.throwIfError(error)
    return toPaginatedResult(
      (data ?? []).map((row) => this.mapRow(row)),
      { limit, page },
      count ?? undefined
    )
  }

  async findById(id: string, tenantId: string): Promise<OrganizationInvite | null> {
    const { data, error } = await this.ctx.supabase
      .from('member_invites')
      .select('id, email, role, expires_at, created_at')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .maybeSingle()

    this.throwIfError(error)
    return data ? this.mapRow(data) : null
  }

  async revoke(inviteId: string, actorId: string): Promise<void> {
    const { error } = await this.ctx.supabase.rpc('revoke_member_invite', {
      p_invite_id: inviteId,
      p_actor_id: actorId,
    })
    this.throwIfError(error)
  }

  private mapRow(row: {
    id: string
    email: string
    role: string
    expires_at: string
    created_at: string
  }): OrganizationInvite {
    return {
      id: row.id,
      email: row.email,
      role: row.role as UserRole,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      isExpired: new Date(row.expires_at) < new Date(),
    }
  }
}
