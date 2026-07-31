import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Tables } from '@/modules/core/types/database'

export type ShortlistRow = Tables<'shortlists'>
export type ShortlistItemRow = Tables<'shortlist_items'>

export class ShortlistRepository extends BaseRepository {
  async findByOpportunity(opportunityId: string, tenantId: string): Promise<ShortlistRow | null> {
    const { data } = await this.ctx.supabase
      .from('shortlists')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    return data ?? null
  }

  async findIdByOpportunity(opportunityId: string): Promise<string | null> {
    const { data } = await this.ctx.supabase
      .from('shortlists')
      .select('id')
      .eq('opportunity_id', opportunityId)
      .maybeSingle()
    return data?.id ?? null
  }

  async create(input: {
    tenant_id: string
    opportunity_id: string
    created_by: string
  }): Promise<string> {
    const { data, error } = await this.ctx.supabase
      .from('shortlists')
      .insert(input)
      .select('id')
      .single()

    this.throwIfError(error)
    if (!data?.id) this.notFound('Shortlist')
    return data.id
  }

  async getOrCreate(opportunityId: string, tenantId: string, createdBy: string): Promise<string> {
    const existing = await this.findIdByOpportunity(opportunityId)
    if (existing) return existing
    return this.create({ tenant_id: tenantId, opportunity_id: opportunityId, created_by: createdBy })
  }

  async listActiveItems(shortlistId: string): Promise<ShortlistItemRow[]> {
    const { data } = await this.ctx.supabase
      .from('shortlist_items')
      .select('*')
      .eq('shortlist_id', shortlistId)
      .neq('status', 'rejected')
      .order('rank')
      .order('created_at')
    return data ?? []
  }

  async findMaxRank(shortlistId: string): Promise<number> {
    const { data } = await this.ctx.supabase
      .from('shortlist_items')
      .select('rank')
      .eq('shortlist_id', shortlistId)
      .order('rank', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data?.rank ?? 0
  }

  async upsertItems(
    rows: Array<{
      shortlist_id: string
      freelancer_id: string
      tenant_id: string
      rank: number
      status: string
    }>
  ): Promise<void> {
    const { error } = await this.ctx.supabase.from('shortlist_items').upsert(rows, {
      onConflict: 'shortlist_id,freelancer_id',
      ignoreDuplicates: true,
    })
    this.throwIfError(error)
  }

  async updateItem(itemId: string, tenantId: string, patch: Record<string, unknown>): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('shortlist_items')
      .update(patch as never)
      .eq('id', itemId)
      .eq('tenant_id', tenantId)
    this.throwIfError(error)
  }

  async rejectItem(itemId: string, tenantId: string, reason: string): Promise<void> {
    await this.updateItem(itemId, tenantId, {
      status: 'rejected',
      rejection_reason: reason.trim(),
    })
  }
}
