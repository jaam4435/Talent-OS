import { BaseRepository } from '@/lib/repositories/base/base.repository'
import { toPaginatedResult, type PaginatedResult } from '@/lib/repositories/base/types'
import type { OrganizationDepartment } from '@/modules/organization/types'

export interface CreateDepartmentInput {
  tenant_id: string
  name: string
  slug: string
  description?: string | null
}

export class OrganizationDepartmentRepository extends BaseRepository {
  async create(input: CreateDepartmentInput): Promise<OrganizationDepartment> {
    const { data, error } = await this.ctx.supabase
      .from('org_departments')
      .insert(input)
      .select('id, name, slug, description, created_at, updated_at')
      .single()

    if (error?.code === '23505') {
      throw this.mapError(error, 'A department with this slug already exists.')
    }
    this.throwIfError(error)
    this.invalidateTable('org_departments')
    if (!data) this.notFound('Department')
    return this.mapRow(data)
  }

  async findById(id: string, tenantId: string): Promise<OrganizationDepartment | null> {
    const { data, error } = await this.ctx.supabase
      .from('org_departments')
      .select('id, name, slug, description, created_at, updated_at')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    this.throwIfError(error)
    return data ? this.mapRow(data) : null
  }

  async list(
    tenantId: string,
    options: { page?: number; limit?: number; q?: string }
  ): Promise<PaginatedResult<OrganizationDepartment>> {
    const { limit, offset, page } = this.paginate(options)
    let query = this.ctx.supabase
      .from('org_departments')
      .select('id, name, slug, description, created_at, updated_at', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name')

    if (options.q?.trim()) {
      query = query.ilike('name', `%${options.q.trim()}%`)
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1)
    this.throwIfError(error)
    return toPaginatedResult((data ?? []).map((row) => this.mapRow(row)), { limit, page }, count ?? undefined)
  }

  async update(
    id: string,
    tenantId: string,
    patch: { name?: string; description?: string | null }
  ): Promise<OrganizationDepartment> {
    const { data, error } = await this.ctx.supabase
      .from('org_departments')
      .update(patch)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('id, name, slug, description, created_at, updated_at')
      .single()

    this.throwIfError(error)
    this.invalidateTable('org_departments')
    if (!data) this.notFound('Department')
    return this.mapRow(data)
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('org_departments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    this.throwIfError(error)
    this.invalidateTable('org_departments')
  }

  private mapRow(row: {
    id: string
    name: string
    slug: string
    description: string | null
    created_at: string
    updated_at: string
  }): OrganizationDepartment {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}
