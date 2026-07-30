import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Tables } from '@/modules/core/types/database'
import type { MilestoneStatus } from '@/modules/core/types/enums'

export type TaskRow = Tables<'milestones'>

export class TaskRepository extends BaseRepository {
  async findById(milestoneId: string, tenantId: string): Promise<TaskRow | null> {
    const { data } = await this.ctx.supabase
      .from('milestones')
      .select('*')
      .eq('id', milestoneId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    return data ?? null
  }

  async findSummary(
    milestoneId: string,
    tenantId: string
  ): Promise<Pick<TaskRow, 'id' | 'project_id' | 'title' | 'status' | 'tenant_id'> | null> {
    const { data } = await this.ctx.supabase
      .from('milestones')
      .select('id, project_id, title, status, tenant_id')
      .eq('id', milestoneId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    return data ?? null
  }

  async findFirstDueDate(projectId: string): Promise<string | null> {
    const { data } = await this.ctx.supabase
      .from('milestones')
      .select('due_date')
      .eq('project_id', projectId)
      .order('sort_order')
      .limit(1)
      .maybeSingle()
    return data?.due_date ?? null
  }

  async listByProject(projectId: string): Promise<TaskRow[]> {
    const { data } = await this.ctx.supabase
      .from('milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order')
    return data ?? []
  }

  async update(milestoneId: string, patch: Record<string, unknown>): Promise<void> {
    const { error } = await this.ctx.supabase.from('milestones').update(patch as never).eq('id', milestoneId)
    this.throwIfError(error)
    this.invalidateTable('milestones')
  }

  async countNonApprovedByProject(projectId: string): Promise<number> {
    const { count } = await this.ctx.supabase
      .from('milestones')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .neq('status', 'approved')
    return count ?? 0
  }

  async listOverdue(now: string) {
    const { data } = await this.ctx.supabase
      .from('milestones')
      .select('id, title, project_id, tenant_id, due_date')
      .lt('due_date', now.split('T')[0])
      .in('status', ['pending', 'in_progress', 'revision', 'submitted'])
    return data ?? []
  }

  async submit(
    milestoneId: string,
    submissionNote: string | null
  ): Promise<void> {
    await this.update(milestoneId, {
      status: 'submitted' satisfies MilestoneStatus,
      submission_note: submissionNote,
      submitted_at: new Date().toISOString(),
    })
  }

  async review(
    milestoneId: string,
    status: MilestoneStatus,
    reviewedBy: string,
    reviewNote: string | null
  ): Promise<void> {
    await this.update(milestoneId, {
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
      review_note: reviewNote,
    })
  }
}
