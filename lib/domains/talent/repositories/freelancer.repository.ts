import type { RepositoryContext } from '@/lib/core/context'
import { DomainError, ErrorCodes } from '@/lib/core/errors'
import { throwIfSupabaseError } from '@/lib/core/supabase-errors'
import type {
  FreelancerInsertRow,
  FreelancerSelfUpdateRow,
  FreelancerUpdateRow,
} from '@/lib/domains/talent/mappers/freelancer.mapper'
import type { TalentSearchQuery } from '@/lib/domains/talent/types'
import type { Tables } from '@/types/database'

export class FreelancerRepository {
  constructor(private readonly ctx: RepositoryContext) {}

  async create(row: FreelancerInsertRow): Promise<string> {
    const { data, error } = await this.ctx.supabase
      .from('freelancers')
      .insert(row)
      .select('id')
      .single()

    throwIfSupabaseError(error)

    if (!data?.id) {
      throw new DomainError(ErrorCodes.DATABASE, 'Failed to create freelancer')
    }

    return data.id
  }

  async update(freelancerId: string, tenantId: string, row: FreelancerUpdateRow): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('freelancers')
      .update(row)
      .eq('id', freelancerId)
      .eq('tenant_id', tenantId)

    throwIfSupabaseError(error)
  }

  async updateSelf(freelancerId: string, row: FreelancerSelfUpdateRow): Promise<void> {
    const { error } = await this.ctx.supabase.from('freelancers').update(row).eq('id', freelancerId)

    throwIfSupabaseError(error)
  }

  async delete(freelancerId: string, tenantId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('freelancers')
      .delete()
      .eq('id', freelancerId)
      .eq('tenant_id', tenantId)

    throwIfSupabaseError(error)
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

  async search(tenantId: string, params: TalentSearchQuery): Promise<Tables<'freelancers'>[]> {
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

    throwIfSupabaseError(error)
    return data ?? []
  }
}
