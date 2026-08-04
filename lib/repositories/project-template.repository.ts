import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Json } from '@/modules/core/types/database'
import type { ProjectTemplate } from '@/modules/project/types'

export class ProjectTemplateRepository extends BaseRepository {
  async create(input: {
    tenant_id: string
    name: string
    description?: string | null
    default_milestones?: Array<Record<string, unknown>>
    default_tasks?: Array<Record<string, unknown>>
    is_active?: boolean
  }): Promise<ProjectTemplate> {
    const { data, error } = await this.ctx.supabase
      .from('project_templates')
      .insert({
        ...input,
        default_milestones: (input.default_milestones ?? []) as Json,
        default_tasks: (input.default_tasks ?? []) as Json,
      })
      .select('*')
      .single()
    this.throwIfError(error)
    if (!data) this.notFound('Template')
    return this.mapRow(data)
  }

  async findById(id: string, tenantId: string): Promise<ProjectTemplate | null> {
    const { data, error } = await this.ctx.supabase
      .from('project_templates')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()
    this.throwIfError(error)
    return data ? this.mapRow(data) : null
  }

  async list(tenantId: string): Promise<ProjectTemplate[]> {
    const { data, error } = await this.ctx.supabase
      .from('project_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('name')
    this.throwIfError(error)
    return (data ?? []).map((r) => this.mapRow(r))
  }

  async update(id: string, tenantId: string, patch: Record<string, unknown>): Promise<ProjectTemplate> {
    const dbPatch = { ...patch }
    if (patch.default_milestones) dbPatch.default_milestones = patch.default_milestones as Json
    if (patch.default_tasks) dbPatch.default_tasks = patch.default_tasks as Json

    const { data, error } = await this.ctx.supabase
      .from('project_templates')
      .update(dbPatch as never)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('*')
      .single()
    this.throwIfError(error)
    if (!data) this.notFound('Template')
    return this.mapRow(data)
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('project_templates')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
    this.throwIfError(error)
  }

  private mapRow(row: Record<string, unknown>): ProjectTemplate {
    return {
      id: row.id as string,
      name: row.name as string,
      description: (row.description as string | null) ?? null,
      defaultMilestones: (row.default_milestones as Array<Record<string, unknown>>) ?? [],
      defaultTasks: (row.default_tasks as Array<Record<string, unknown>>) ?? [],
      isActive: row.is_active as boolean,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
