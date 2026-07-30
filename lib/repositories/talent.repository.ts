import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { PaginationParams, PaginatedResult } from '@/lib/repositories/base/types'
import { toPaginatedResult } from '@/lib/repositories/base/types'
import type {
  FreelancerInsertRow,
  FreelancerSelfUpdateRow,
  FreelancerUpdateRow,
} from '@/lib/domains/talent/mappers/freelancer.mapper'
import type { TalentSearchQuery } from '@/lib/domains/talent/types'
import type { Tables } from '@/modules/core/types/database'

export type TalentRow = Tables<'freelancers'>

export interface TalentContactRow {
  id: string
  full_name: string
  email: string
  phone: string | null
  user_id: string | null
}

export interface TalentNameRow {
  id: string
  full_name: string
}

/** Repository for freelancer / talent roster data access. */
export class TalentRepository extends BaseRepository {
  async create(row: FreelancerInsertRow): Promise<string> {
    const { data, error } = await this.ctx.supabase.from('freelancers').insert(row).select('id').single()
    this.throwIfError(error)
    this.invalidateTable('freelancers')
    if (!data?.id) this.notFound('Freelancer')
    return data.id
  }

  async update(freelancerId: string, tenantId: string, row: FreelancerUpdateRow): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('freelancers')
      .update(row)
      .eq('id', freelancerId)
      .eq('tenant_id', tenantId)
    this.throwIfError(error)
    this.invalidateTable('freelancers')
  }

  async updateSelf(freelancerId: string, row: FreelancerSelfUpdateRow): Promise<void> {
    const { error } = await this.ctx.supabase.from('freelancers').update(row).eq('id', freelancerId)
    this.throwIfError(error)
    this.invalidateTable('freelancers')
  }

  async updateAvailability(
    freelancerId: string,
    tenantId: string,
    availability: string
  ): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('freelancers')
      .update({ availability })
      .eq('id', freelancerId)
      .eq('tenant_id', tenantId)
    this.throwIfError(error)
    this.invalidateTable('freelancers')
  }

  async delete(freelancerId: string, tenantId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('freelancers')
      .delete()
      .eq('id', freelancerId)
      .eq('tenant_id', tenantId)
    this.throwIfError(error)
    this.invalidateTable('freelancers')
  }

  async findById(freelancerId: string, tenantId: string): Promise<TalentRow | null> {
    const { data } = await this.ctx.supabase
      .from('freelancers')
      .select('*')
      .eq('id', freelancerId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    return data ?? null
  }

  async findIdByUserId(userId: string, tenantId: string): Promise<string | null> {
    const { data } = await this.ctx.supabase
      .from('freelancers')
      .select('id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    return data?.id ?? null
  }

  async findInTenant(freelancerId: string, tenantId: string): Promise<{ id: string } | null> {
    const { data } = await this.ctx.supabase
      .from('freelancers')
      .select('id')
      .eq('id', freelancerId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    return data ?? null
  }

  async findOwnedByUser(
    freelancerId: string,
    userId: string
  ): Promise<{ id: string; tenant_id: string } | null> {
    const { data } = await this.ctx.supabase
      .from('freelancers')
      .select('id, tenant_id')
      .eq('id', freelancerId)
      .eq('user_id', userId)
      .maybeSingle()
    return data ?? null
  }

  async findContactById(freelancerId: string): Promise<TalentContactRow | null> {
    const { data } = await this.ctx.supabase
      .from('freelancers')
      .select('id, full_name, email, phone, user_id')
      .eq('id', freelancerId)
      .maybeSingle()
    return data ?? null
  }

  async findUserIdByFreelancerId(freelancerId: string): Promise<string | null> {
    const { data } = await this.ctx.supabase
      .from('freelancers')
      .select('user_id')
      .eq('id', freelancerId)
      .maybeSingle()
    return data?.user_id ?? null
  }

  async findNamesByIds(ids: string[]): Promise<TalentNameRow[]> {
    if (!ids.length) return []
    const { data } = await this.ctx.supabase.from('freelancers').select('id, full_name').in('id', ids)
    return data ?? []
  }

  async findByIds(ids: string[], select = 'id, full_name, email, discipline, day_rate, currency, availability, internal_rating'): Promise<Partial<TalentRow>[]> {
    if (!ids.length) return []
    const { data } = await this.ctx.supabase.from('freelancers').select(select).in('id', ids)
    return (data ?? []) as Partial<TalentRow>[]
  }

  async findBroadcastTargets(tenantId: string, freelancerIds: string[]): Promise<TalentContactRow[]> {
    if (!freelancerIds.length) return []
    const { data } = await this.ctx.supabase
      .from('freelancers')
      .select('id, full_name, phone, user_id, email')
      .eq('tenant_id', tenantId)
      .in('id', freelancerIds)
    return data ?? []
  }

  async search(tenantId: string, params: TalentSearchQuery): Promise<TalentRow[]> {
    const { data, error } = await this.ctx.supabase.rpc('search_freelancers', {
      p_tenant_id: tenantId,
      p_query: params.query ?? null,
      p_discipline: params.discipline ?? null,
      p_availability: params.availability ?? null,
      p_min_rate: params.minRate ?? null,
      p_max_rate: params.maxRate ?? null,
      p_min_rating: params.minRating ?? null,
      p_sort: params.sort ?? 'rating',
      p_limit: params.limit ?? 20,
      p_offset: params.offset ?? 0,
    })
    this.throwIfError(error)
    return data ?? []
  }

  async findNameById(freelancerId: string): Promise<string | null> {
    const { data } = await this.ctx.supabase
      .from('freelancers')
      .select('full_name')
      .eq('id', freelancerId)
      .maybeSingle()
    return data?.full_name ?? null
  }

  async findByPhone(tenantId: string, phone: string) {
    const normalized = phone.startsWith('+') ? phone : `+${phone.replace(/\D/g, '')}`
    const { data } = await this.ctx.supabase
      .from('freelancers')
      .select('id, full_name, user_id, phone')
      .eq('tenant_id', tenantId)
      .or(`phone.eq.${normalized},phone.eq.${normalized.replace('+', '')}`)
      .limit(1)
      .maybeSingle()
    return data ?? null
  }

  async listBroadcastRoster(tenantId: string, limit = 100) {
    const { data } = await this.ctx.supabase
      .from('freelancers')
      .select('id, full_name, email, discipline, availability')
      .eq('tenant_id', tenantId)
      .in('availability', ['available', 'busy'])
      .order('full_name')
      .limit(limit)
    return data ?? []
  }

  async listForProjectForm(tenantId: string) {
    const { data } = await this.ctx.supabase
      .from('freelancers')
      .select('id, full_name, email')
      .eq('tenant_id', tenantId)
      .order('full_name')
    return data ?? []
  }

  async listMatchCandidates(
    tenantId: string,
    options: { discipline?: string | null; excludedIds: string[]; limit?: number }
  ) {
    let query = this.ctx.supabase
      .from('freelancers')
      .select('id, full_name, discipline, skills, day_rate, availability, internal_rating, bio, tags')
      .eq('tenant_id', tenantId)
      .eq('availability', 'available')
      .limit(options.limit ?? 50)

    if (options.discipline) {
      query = query.eq('discipline', options.discipline)
    }

    const { data } = await query
    const excluded = new Set(options.excludedIds)
    return (data ?? []).filter((f) => !excluded.has(f.id))
  }

  async findSkillsByIds(ids: string[]): Promise<Array<{ id: string; skills: string[] | null }>> {
    if (!ids.length) return []
    const { data } = await this.ctx.supabase.from('freelancers').select('id, skills').in('id', ids)
    return data ?? []
  }

  async suggestForOpportunity(opportunityId: string) {
    const { data, error } = await this.ctx.supabase.rpc('suggest_talent_for_opportunity', {
      p_opportunity_id: opportunityId,
    })
    this.throwIfError(error)
    return data ?? []
  }

  async listByTenant(
    tenantId: string,
    filters?: { availability?: string; discipline?: string },
    pagination?: PaginationParams
  ): Promise<PaginatedResult<TalentRow>> {
    const { limit, offset, page } = this.paginate(pagination)
    let query = this.ctx.supabase.from('freelancers').select('*', { count: 'exact' }).eq('tenant_id', tenantId)

    if (filters?.availability) query = query.eq('availability', filters.availability)
    if (filters?.discipline) query = query.eq('discipline', filters.discipline)

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    this.throwIfError(error)
    return toPaginatedResult(data ?? [], { limit, page }, count ?? undefined)
  }
}
