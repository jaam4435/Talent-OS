import { BaseRepository } from '@/lib/repositories/base/base.repository'
import { toPaginatedResult, type PaginatedResult } from '@/lib/repositories/base/types'
import type { CrmDeal } from '@/modules/crm/types'

export class CrmDealRepository extends BaseRepository {
  async create(input: Record<string, unknown>): Promise<CrmDeal> {
    const { data, error } = await this.ctx.supabase.from('crm_deals').insert(input).select('*').single()
    this.throwIfError(error)
    if (!data) this.notFound('Deal')
    return this.mapRow(data)
  }

  async findById(id: string, tenantId: string): Promise<CrmDeal | null> {
    const { data, error } = await this.ctx.supabase
      .from('crm_deals')
      .select('*, crm_pipeline_stages(name)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    this.throwIfError(error)
    return data ? this.mapRow(data) : null
  }

  async list(
    tenantId: string,
    options: { page?: number; limit?: number; q?: string; stage_id?: string; company_id?: string }
  ): Promise<PaginatedResult<CrmDeal>> {
    const { limit, offset, page } = this.paginate(options)
    let query = this.ctx.supabase
      .from('crm_deals')
      .select('*, crm_pipeline_stages(name)', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })

    if (options.q?.trim()) query = query.ilike('title', `%${options.q.trim()}%`)
    if (options.stage_id) query = query.eq('stage_id', options.stage_id)
    if (options.company_id) query = query.eq('company_id', options.company_id)

    const { data, error, count } = await query.range(offset, offset + limit - 1)
    this.throwIfError(error)
    return toPaginatedResult((data ?? []).map((r) => this.mapRow(r)), { limit, page }, count ?? undefined)
  }

  async listByStage(tenantId: string, stageId: string): Promise<CrmDeal[]> {
    const { data, error } = await this.ctx.supabase
      .from('crm_deals')
      .select('*, crm_pipeline_stages(name)')
      .eq('tenant_id', tenantId)
      .eq('stage_id', stageId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })

    this.throwIfError(error)
    return (data ?? []).map((r) => this.mapRow(r))
  }

  async update(id: string, tenantId: string, patch: Record<string, unknown>): Promise<CrmDeal> {
    const { data, error } = await this.ctx.supabase
      .from('crm_deals')
      .update(patch as never)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('*, crm_pipeline_stages(name)')
      .single()

    this.throwIfError(error)
    if (!data) this.notFound('Deal')
    return this.mapRow(data)
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('crm_deals')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
    this.throwIfError(error)
  }

  mapRow(row: Record<string, unknown>): CrmDeal {
    const stage = row.crm_pipeline_stages as { name: string } | { name: string }[] | null
    const stageName = Array.isArray(stage) ? stage[0]?.name : stage?.name
    return {
      id: row.id as string,
      title: row.title as string,
      value: row.value != null ? Number(row.value) : null,
      currency: row.currency as string,
      stageId: row.stage_id as string,
      stageName,
      companyId: (row.company_id as string | null) ?? null,
      leadId: (row.lead_id as string | null) ?? null,
      opportunityId: (row.opportunity_id as string | null) ?? null,
      ownerId: (row.owner_id as string | null) ?? null,
      expectedCloseDate: (row.expected_close_date as string | null) ?? null,
      probability: row.probability != null ? Number(row.probability) : null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
