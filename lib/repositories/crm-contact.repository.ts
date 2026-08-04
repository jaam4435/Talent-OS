import { BaseRepository } from '@/lib/repositories/base/base.repository'
import { toPaginatedResult, type PaginatedResult } from '@/lib/repositories/base/types'
import type { CrmContact } from '@/modules/crm/types'

export class CrmContactRepository extends BaseRepository {
  async create(input: {
    tenant_id: string
    company_id?: string | null
    first_name: string
    last_name?: string | null
    email?: string | null
    phone?: string | null
    job_title?: string | null
    is_primary?: boolean
  }): Promise<CrmContact> {
    const { data, error } = await this.ctx.supabase.from('crm_contacts').insert(input).select('*').single()
    this.throwIfError(error)
    if (!data) this.notFound('Contact')
    return this.mapRow(data)
  }

  async findById(id: string, tenantId: string): Promise<CrmContact | null> {
    const { data, error } = await this.ctx.supabase
      .from('crm_contacts')
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
    options: { page?: number; limit?: number; q?: string; company_id?: string }
  ): Promise<PaginatedResult<CrmContact>> {
    const { limit, offset, page } = this.paginate(options)
    let query = this.ctx.supabase
      .from('crm_contacts')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('last_name')

    if (options.company_id) query = query.eq('company_id', options.company_id)
    if (options.q?.trim()) {
      query = query.or(
        `first_name.ilike.%${options.q.trim()}%,last_name.ilike.%${options.q.trim()}%,email.ilike.%${options.q.trim()}%`
      )
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1)
    this.throwIfError(error)
    return toPaginatedResult((data ?? []).map((r) => this.mapRow(r)), { limit, page }, count ?? undefined)
  }

  async update(id: string, tenantId: string, patch: Record<string, unknown>): Promise<CrmContact> {
    const { data, error } = await this.ctx.supabase
      .from('crm_contacts')
      .update(patch as never)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('*')
      .single()
    this.throwIfError(error)
    if (!data) this.notFound('Contact')
    return this.mapRow(data)
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('crm_contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
    this.throwIfError(error)
  }

  private mapRow(row: Record<string, unknown>): CrmContact {
    return {
      id: row.id as string,
      companyId: (row.company_id as string | null) ?? null,
      firstName: row.first_name as string,
      lastName: (row.last_name as string | null) ?? null,
      email: (row.email as string | null) ?? null,
      phone: (row.phone as string | null) ?? null,
      jobTitle: (row.job_title as string | null) ?? null,
      isPrimary: Boolean(row.is_primary),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
