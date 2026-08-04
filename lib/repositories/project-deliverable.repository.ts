import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { ProjectDeliverable, ProjectDeliverableStatus } from '@/modules/project/types'

export class ProjectDeliverableRepository extends BaseRepository {
  async create(input: {
    tenant_id: string
    project_id: string
    milestone_id?: string | null
    task_id?: string | null
    title: string
    description?: string | null
    status?: ProjectDeliverableStatus
    file_path?: string | null
  }): Promise<ProjectDeliverable> {
    const { data, error } = await this.ctx.supabase.from('project_deliverables').insert(input).select('*').single()
    this.throwIfError(error)
    if (!data) this.notFound('Deliverable')
    return this.mapRow(data)
  }

  async findById(id: string, tenantId: string): Promise<ProjectDeliverable | null> {
    const { data, error } = await this.ctx.supabase
      .from('project_deliverables')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()
    this.throwIfError(error)
    return data ? this.mapRow(data) : null
  }

  async listByProject(projectId: string, tenantId: string): Promise<ProjectDeliverable[]> {
    const { data, error } = await this.ctx.supabase
      .from('project_deliverables')
      .select('*')
      .eq('project_id', projectId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    this.throwIfError(error)
    return (data ?? []).map((r) => this.mapRow(r))
  }

  async update(id: string, tenantId: string, patch: Record<string, unknown>): Promise<ProjectDeliverable> {
    const { data, error } = await this.ctx.supabase
      .from('project_deliverables')
      .update(patch as never)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('*')
      .single()
    this.throwIfError(error)
    if (!data) this.notFound('Deliverable')
    return this.mapRow(data)
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('project_deliverables')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
    this.throwIfError(error)
  }

  private mapRow(row: Record<string, unknown>): ProjectDeliverable {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      milestoneId: (row.milestone_id as string | null) ?? null,
      taskId: (row.task_id as string | null) ?? null,
      title: row.title as string,
      description: (row.description as string | null) ?? null,
      status: row.status as ProjectDeliverableStatus,
      filePath: (row.file_path as string | null) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
