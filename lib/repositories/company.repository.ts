import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Tables } from '@/modules/core/types/database'

export type CompanyRow = Tables<'companies'>

export interface CompanyListItem {
  id: string
  name: string
  slug: string
  contactEmail: string | null
  contactName: string | null
}

export interface CreateCompanyInput {
  tenant_id: string
  name: string
  slug: string
  contact_email?: string | null
  contact_name?: string | null
  website?: string | null
}

export class CompanyRepository extends BaseRepository {
  async create(input: CreateCompanyInput): Promise<string> {
    const { data, error } = await this.ctx.supabase
      .from('companies')
      .insert(input)
      .select('id')
      .single()

    if (error?.code === '23505') {
      throw this.mapError(error, 'A company with this name already exists.')
    }
    this.throwIfError(error)
    this.invalidateTable('companies')
    if (!data?.id) this.notFound('Company')
    return data.id
  }

  async findById(companyId: string, tenantId: string): Promise<CompanyListItem | null> {
    const { data } = await this.ctx.supabase
      .from('companies')
      .select('id, name, slug, contact_email, contact_name')
      .eq('id', companyId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!data) return null
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      contactEmail: data.contact_email,
      contactName: data.contact_name,
    }
  }

  async findName(companyId: string, tenantId: string): Promise<string | null> {
    const { data } = await this.ctx.supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    return data?.name ?? null
  }

  async listByTenant(tenantId: string): Promise<CompanyListItem[]> {
    const cacheKey = this.cacheKey('companies', { tenantId, list: true })
    return this.withCache(cacheKey, 30_000, async () => {
      const { data, error } = await this.ctx.supabase
        .from('companies')
        .select('id, name, slug, contact_email, contact_name')
        .eq('tenant_id', tenantId)
        .order('name')

      this.throwIfError(error)
      return (data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        contactEmail: c.contact_email,
        contactName: c.contact_name,
      }))
    })
  }

  async countByTenant(tenantId: string): Promise<number> {
    const { count } = await this.ctx.supabase
      .from('companies')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
    return count ?? 0
  }
}
