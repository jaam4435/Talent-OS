import { BaseRepository } from '@/lib/repositories/base/base.repository'
import { slugify } from '@/modules/core/utils/format'
import { toPaginatedResult, type PaginatedResult } from '@/lib/repositories/base/types'
import type { CrmCompany, CrmCompanyStatus } from '@/modules/crm/types'

export class CrmCompanyRepository extends BaseRepository {
  async create(input: {
    tenant_id: string
    name: string
    slug?: string
    contact_email?: string | null
    contact_name?: string | null
    website?: string | null
    industry?: string | null
    status?: CrmCompanyStatus
    notes?: string | null
  }): Promise<CrmCompany> {
    const slug = input.slug ?? slugify(input.name)
    const { data, error } = await this.ctx.supabase
      .from('companies')
      .insert({ ...input, slug })
      .select('id, name, slug, status, contact_email, contact_name, website, industry, notes, created_at, updated_at')
      .single()

    if (error?.code === '23505') throw this.mapError(error, 'A company with this name already exists.')
    this.throwIfError(error)
    if (!data) this.notFound('Company')
    this.invalidateTable('companies')
    return this.mapRow(data)
  }

  async findById(id: string, tenantId: string): Promise<CrmCompany | null> {
    const { data, error } = await this.ctx.supabase
      .from('companies')
      .select('id, name, slug, status, contact_email, contact_name, website, industry, notes, created_at, updated_at')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    this.throwIfError(error)
    return data ? this.mapRow(data) : null
  }

  async list(
    tenantId: string,
    options: { page?: number; limit?: number; q?: string; status?: string }
  ): Promise<PaginatedResult<CrmCompany>> {
    const { limit, offset, page } = this.paginate(options)
    let query = this.ctx.supabase
      .from('companies')
      .select('id, name, slug, status, contact_email, contact_name, website, industry, notes, created_at, updated_at', {
        count: 'exact',
      })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name')

    if (options.q?.trim()) query = query.ilike('name', `%${options.q.trim()}%`)
    if (options.status) query = query.eq('status', options.status as CrmCompanyStatus)

    const { data, error, count } = await query.range(offset, offset + limit - 1)
    this.throwIfError(error)
    return toPaginatedResult((data ?? []).map((r) => this.mapRow(r)), { limit, page }, count ?? undefined)
  }

  async update(
    id: string,
    tenantId: string,
    patch: Partial<{
      name: string
      contact_email: string | null
      contact_name: string | null
      website: string | null
      industry: string | null
      status: CrmCompanyStatus
      notes: string | null
    }>
  ): Promise<CrmCompany> {
    const { data, error } = await this.ctx.supabase
      .from('companies')
      .update(patch)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('id, name, slug, status, contact_email, contact_name, website, industry, notes, created_at, updated_at')
      .single()

    this.throwIfError(error)
    if (!data) this.notFound('Company')
    this.invalidateTable('companies')
    return this.mapRow(data)
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('companies')
      .update({ deleted_at: new Date().toISOString(), status: 'inactive' })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
    this.throwIfError(error)
    this.invalidateTable('companies')
  }

  private mapRow(row: {
    id: string
    name: string
    slug: string
    status: string
    contact_email: string | null
    contact_name: string | null
    website: string | null
    industry: string | null
    notes: string | null
    created_at: string
    updated_at: string
  }): CrmCompany {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status as CrmCompanyStatus,
      contactEmail: row.contact_email,
      contactName: row.contact_name,
      website: row.website,
      industry: row.industry,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}
