import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { ProjectTask, ProjectTaskStatus, ProjectPriority } from '@/modules/project/types'

export class ProjectTaskRepository extends BaseRepository {
  async create(input: {
    tenant_id: string
    project_id: string
    milestone_id?: string | null
    title: string
    description?: string | null
    status?: ProjectTaskStatus
    priority?: ProjectPriority
    assignee_id?: string | null
    due_date?: string | null
    sort_order?: number
  }): Promise<ProjectTask> {
    const { data, error } = await this.ctx.supabase.from('project_tasks').insert(input).select('*').single()
    this.throwIfError(error)
    if (!data) this.notFound('Task')
    return this.mapRow(data)
  }

  async findById(id: string, tenantId: string): Promise<ProjectTask | null> {
    const { data, error } = await this.ctx.supabase
      .from('project_tasks')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()
    this.throwIfError(error)
    return data ? this.mapRow(data) : null
  }

  async listByProject(projectId: string, tenantId: string): Promise<ProjectTask[]> {
    const { data, error } = await this.ctx.supabase
      .from('project_tasks')
      .select('*')
      .eq('project_id', projectId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('sort_order')
    this.throwIfError(error)
    return (data ?? []).map((r) => this.mapRow(r))
  }

  async update(id: string, tenantId: string, patch: Record<string, unknown>): Promise<ProjectTask> {
    const { data, error } = await this.ctx.supabase
      .from('project_tasks')
      .update(patch as never)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('*')
      .single()
    this.throwIfError(error)
    if (!data) this.notFound('Task')
    return this.mapRow(data)
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('project_tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
    this.throwIfError(error)
  }

  private mapRow(row: Record<string, unknown>): ProjectTask {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      milestoneId: (row.milestone_id as string | null) ?? null,
      title: row.title as string,
      description: (row.description as string | null) ?? null,
      status: row.status as ProjectTaskStatus,
      priority: row.priority as ProjectPriority,
      assigneeId: (row.assignee_id as string | null) ?? null,
      dueDate: (row.due_date as string | null) ?? null,
      sortOrder: row.sort_order as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
