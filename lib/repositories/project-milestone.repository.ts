import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { MilestoneStatus } from '@/modules/core/types/enums'
import type { ProjectMilestone, ProjectPriority } from '@/modules/project/types'

export class ProjectMilestoneRepository extends BaseRepository {
  async create(input: {
    tenant_id: string
    project_id: string
    title: string
    description?: string | null
    amount: number
    due_date?: string | null
    priority?: ProjectPriority
    sort_order?: number
    status?: MilestoneStatus
  }): Promise<ProjectMilestone> {
    const { data, error } = await this.ctx.supabase.from('milestones').insert(input).select('*').single()
    this.throwIfError(error)
    if (!data) this.notFound('Milestone')
    return this.mapRow(data)
  }

  async findById(id: string, tenantId: string): Promise<ProjectMilestone | null> {
    const { data, error } = await this.ctx.supabase
      .from('milestones')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()
    this.throwIfError(error)
    return data ? this.mapRow(data) : null
  }

  async listByProject(projectId: string): Promise<ProjectMilestone[]> {
    const { data, error } = await this.ctx.supabase
      .from('milestones')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('sort_order')
    this.throwIfError(error)
    return (data ?? []).map((r) => this.mapRow(r))
  }

  async update(id: string, tenantId: string, patch: Record<string, unknown>): Promise<ProjectMilestone> {
    const { data, error } = await this.ctx.supabase
      .from('milestones')
      .update(patch as never)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('*')
      .single()
    this.throwIfError(error)
    if (!data) this.notFound('Milestone')
    return this.mapRow(data)
  }

  private mapRow(row: Record<string, unknown>): ProjectMilestone {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      title: row.title as string,
      description: (row.description as string | null) ?? null,
      amount: Number(row.amount),
      dueDate: (row.due_date as string | null) ?? null,
      status: row.status as MilestoneStatus,
      priority: (row.priority as ProjectPriority) ?? 'medium',
      sortOrder: row.sort_order as number,
      submittedAt: (row.submitted_at as string | null) ?? null,
      reviewedAt: (row.reviewed_at as string | null) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
