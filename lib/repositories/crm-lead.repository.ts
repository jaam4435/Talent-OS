import { BaseRepository } from '@/lib/repositories/base/base.repository'
import { toPaginatedResult, type PaginatedResult } from '@/lib/repositories/base/types'
import type { CrmLead, CrmLeadStatus } from '@/modules/crm/types'

export class CrmLeadRepository extends BaseRepository {
  async create(input: {
    tenant_id: string
    title: string
    source?: string | null
    status?: CrmLeadStatus
    company_id?: string | null
    contact_id?: string | null
    owner_id?: string | null
    value_estimate?: number | null
    currency?: string
    description?: string | null
  }): Promise<CrmLead> {
    const { data, error } = await this.ctx.supabase
      .from('crm_leads')
      .insert(input)
      .select('*')
      .single()

    this.throwIfError(error)
    if (!data) this.notFound('Lead')
    return this.mapRow(data)
  }

  async findById(id: string, tenantId: string): Promise<CrmLead | null> {
    const { data, error } = await this.ctx.supabase
      .from('crm_leads')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    this.throwIfError(error)
    return data ? this.mapRow(data) : null
  }

  async list(
    tenantId: string,
    options: { page?: number; limit?: number; q?: string; status?: string; company_id?: string }
  ): Promise<PaginatedResult<CrmLead>> {
    const { limit, offset, page } = this.paginate(options)
    let query = this.ctx.supabase
      .from('crm_leads')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (options.q?.trim()) query = query.ilike('title', `%${options.q.trim()}%`)
    if (options.status) query = query.eq('status', options.status as CrmLeadStatus)
    if (options.company_id) query = query.eq('company_id', options.company_id)

    const { data, error, count } = await query.range(offset, offset + limit - 1)
    this.throwIfError(error)
    return toPaginatedResult((data ?? []).map((r) => this.mapRow(r)), { limit, page }, count ?? undefined)
  }

  async update(
    id: string,
    tenantId: string,
    patch: Record<string, unknown>
  ): Promise<CrmLead> {
    const { data, error } = await this.ctx.supabase
      .from('crm_leads')
      .update(patch as never)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('*')
      .single()

    this.throwIfError(error)
    if (!data) this.notFound('Lead')
    return this.mapRow(data)
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('crm_leads')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
    this.throwIfError(error)
  }

  private mapRow(row: Record<string, unknown>): CrmLead {
    return {
      id: row.id as string,
      title: row.title as string,
      source: (row.source as string | null) ?? null,
      status: row.status as CrmLeadStatus,
      companyId: (row.company_id as string | null) ?? null,
      contactId: (row.contact_id as string | null) ?? null,
      ownerId: (row.owner_id as string | null) ?? null,
      valueEstimate: row.value_estimate != null ? Number(row.value_estimate) : null,
      currency: row.currency as string,
      description: (row.description as string | null) ?? null,
      convertedAt: (row.converted_at as string | null) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
