import { BaseRepository } from '@/lib/repositories/base/base.repository'
import { toPaginatedResult, type PaginatedResult } from '@/lib/repositories/base/types'
import type { CrmContract, CrmContractStatus } from '@/modules/crm/types'

export class CrmContractRepository extends BaseRepository {
  async create(input: Record<string, unknown>): Promise<CrmContract> {
    const { data, error } = await this.ctx.supabase.from('crm_contracts').insert(input).select('*').single()
    this.throwIfError(error)
    if (!data) this.notFound('Contract')
    return this.mapRow(data)
  }

  async findById(id: string, tenantId: string): Promise<CrmContract | null> {
    const { data, error } = await this.ctx.supabase
      .from('crm_contracts')
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
    options: { page?: number; limit?: number; status?: string; company_id?: string }
  ): Promise<PaginatedResult<CrmContract>> {
    const { limit, offset, page } = this.paginate(options)
    let query = this.ctx.supabase
      .from('crm_contracts')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (options.status) query = query.eq('status', options.status as CrmContractStatus)
    if (options.company_id) query = query.eq('company_id', options.company_id)

    const { data, error, count } = await query.range(offset, offset + limit - 1)
    this.throwIfError(error)
    return toPaginatedResult((data ?? []).map((r) => this.mapRow(r)), { limit, page }, count ?? undefined)
  }

  async update(id: string, tenantId: string, patch: Record<string, unknown>): Promise<CrmContract> {
    const { data, error } = await this.ctx.supabase
      .from('crm_contracts')
      .update(patch as never)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('*')
      .single()
    this.throwIfError(error)
    if (!data) this.notFound('Contract')
    return this.mapRow(data)
  }

  private mapRow(row: Record<string, unknown>): CrmContract {
    return {
      id: row.id as string,
      title: row.title as string,
      status: row.status as CrmContractStatus,
      dealId: (row.deal_id as string | null) ?? null,
      companyId: (row.company_id as string | null) ?? null,
      value: row.value != null ? Number(row.value) : null,
      currency: row.currency as string,
      startsOn: (row.starts_on as string | null) ?? null,
      endsOn: (row.ends_on as string | null) ?? null,
      signedAt: (row.signed_at as string | null) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
