import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { PaginationParams, PaginatedResult } from '@/lib/repositories/base/types'
import { toPaginatedResult } from '@/lib/repositories/base/types'
import type { Tables, Json } from '@/modules/core/types/database'
import type { ProjectStatus } from '@/modules/core/types/enums'

export type ProjectRow = Tables<'projects'>

export interface ProjectListItem {
  id: string
  title: string
  status: string
  client_name: string | null
  freelancer_id: string
  created_at: string
  company_id?: string | null
  budget?: number | null
  currency?: string
}

export interface CreateProjectRpcInput {
  tenantId: string
  assignedBy: string
  freelancerId: string
  title: string
  milestones: Array<Record<string, unknown>>
  opportunityId?: string | null
  shortlistId?: string | null
  description?: string | null
  clientName?: string | null
  budget?: number | null
  currency?: string
  status?: string
  companyId?: string | null
}

export class ProjectRepository extends BaseRepository {
  async createWithMilestones(input: CreateProjectRpcInput): Promise<string> {
    const { data, error } = await this.ctx.supabase.rpc('create_project_with_milestones', {
      p_tenant_id: input.tenantId,
      p_assigned_by: input.assignedBy,
      p_freelancer_id: input.freelancerId,
      p_title: input.title,
      p_milestones: input.milestones as Json,
      p_opportunity_id: input.opportunityId ?? null,
      p_shortlist_id: input.shortlistId ?? null,
      p_description: input.description ?? null,
      p_client_name: input.clientName ?? null,
      p_budget: input.budget ?? null,
      p_currency: input.currency ?? 'USD',
      p_status: input.status ?? 'active',
      p_company_id: input.companyId ?? null,
    })

    this.throwIfError(error)
    this.invalidateTable('projects')
    if (!data) this.notFound('Project')
    return data as string
  }

  async findById(projectId: string, tenantId: string): Promise<ProjectRow | null> {
    const { data } = await this.ctx.supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    return data ?? null
  }

  async findSummary(projectId: string, tenantId: string): Promise<Pick<ProjectRow, 'id' | 'status' | 'tenant_id' | 'freelancer_id'> | null> {
    const { data } = await this.ctx.supabase
      .from('projects')
      .select('id, status, tenant_id, freelancer_id')
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    return data ?? null
  }

  async updateStatus(projectId: string, patch: Record<string, unknown>): Promise<void> {
    const { error } = await this.ctx.supabase.from('projects').update(patch as never).eq('id', projectId)
    this.throwIfError(error)
    this.invalidateTable('projects')
  }

  async updateAiSummary(projectId: string, summary: Record<string, unknown>): Promise<void> {
    await this.updateStatus(projectId, { ai_summary: summary })
  }

  async updateStatusAssessment(projectId: string, assessment: Record<string, unknown>): Promise<void> {
    await this.updateStatus(projectId, { ai_status_assessment: assessment })
  }

  async findAiFields(projectId: string, tenantId: string) {
    const { data } = await this.ctx.supabase
      .from('projects')
      .select('ai_summary, ai_status_assessment, status')
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    return data ?? null
  }

  async findAssignedBy(projectId: string): Promise<{ title: string; assigned_by: string | null; status: string } | null> {
    const { data } = await this.ctx.supabase
      .from('projects')
      .select('title, assigned_by, status')
      .eq('id', projectId)
      .maybeSingle()
    return data ?? null
  }

  async listByTenant(
    tenantId: string,
    filters?: { freelancerId?: string; companyId?: string; status?: ProjectStatus },
    pagination?: PaginationParams
  ): Promise<PaginatedResult<ProjectListItem>> {
    const { limit, offset, page } = this.paginate({ ...pagination, limit: pagination?.limit ?? 100 })

    let query = this.ctx.supabase
      .from('projects')
      .select('id, title, status, client_name, freelancer_id, created_at, company_id, budget, currency', {
        count: 'exact',
      })
      .eq('tenant_id', tenantId)

    if (filters?.freelancerId) query = query.eq('freelancer_id', filters.freelancerId)
    if (filters?.companyId) query = query.eq('company_id', filters.companyId)
    if (filters?.status) query = query.eq('status', filters.status)

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    this.throwIfError(error)
    return toPaginatedResult((data ?? []) as ProjectListItem[], { limit, page }, count ?? undefined)
  }

  async listForFreelancer(
    freelancerId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Pick<ProjectRow, 'id' | 'title' | 'status'>>> {
    const { limit, offset, page } = this.paginate({ ...pagination, limit: pagination?.limit ?? 5 })
    const { data, count, error } = await this.ctx.supabase
      .from('projects')
      .select('id, title, status', { count: 'exact' })
      .eq('freelancer_id', freelancerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    this.throwIfError(error)
    return toPaginatedResult(data ?? [], { limit, page }, count ?? undefined)
  }

  async findSummaryContext(projectId: string) {
    const { data: project } = await this.ctx.supabase
      .from('projects')
      .select('id, tenant_id, title, status, description, budget, currency, client_name, freelancer_id')
      .eq('id', projectId)
      .maybeSingle()

    if (!project) return null

    const [milestones, activity, freelancer] = await Promise.all([
      this.ctx.supabase
        .from('milestones')
        .select('title, status, due_date, amount, submission_note, review_note')
        .eq('project_id', projectId)
        .order('sort_order'),
      this.ctx.supabase
        .from('activity_logs')
        .select('action, metadata, created_at')
        .eq('entity_type', 'project')
        .eq('entity_id', projectId)
        .order('created_at', { ascending: false })
        .limit(15),
      this.ctx.supabase
        .from('freelancers')
        .select('full_name, discipline, availability')
        .eq('id', project.freelancer_id)
        .maybeSingle(),
    ])

    const now = new Date()
    const milestoneRows = milestones.data ?? []
    const overdueCount = milestoneRows.filter(
      (m) =>
        m.due_date &&
        new Date(m.due_date) < now &&
        !['approved', 'canceled'].includes(m.status)
    ).length

    return {
      project,
      milestones: milestoneRows,
      activity: activity.data ?? [],
      freelancer: freelancer.data ?? null,
      overdueCount,
    }
  }

  async findStatusContext(projectId: string) {
    const { data: project } = await this.ctx.supabase
      .from('projects')
      .select('id, tenant_id, title, status, description')
      .eq('id', projectId)
      .maybeSingle()

    if (!project) return null

    const [milestones, activity] = await Promise.all([
      this.ctx.supabase
        .from('milestones')
        .select('title, status, due_date, submitted_at')
        .eq('project_id', projectId)
        .order('sort_order'),
      this.ctx.supabase
        .from('activity_logs')
        .select('action, metadata, created_at')
        .eq('entity_type', 'project')
        .eq('entity_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    const milestoneRows = milestones.data ?? []
    const now = new Date()
    const overdueCount = milestoneRows.filter(
      (m) =>
        m.due_date &&
        new Date(m.due_date) < now &&
        !['approved', 'canceled'].includes(m.status)
    ).length

    return {
      project,
      milestones: milestoneRows,
      activity: activity.data ?? [],
      overdueCount,
      submittedCount: milestoneRows.filter((m) => m.status === 'submitted').length,
      revisionCount: milestoneRows.filter((m) => m.status === 'revision').length,
    }
  }

  async findModuleById(projectId: string, tenantId: string): Promise<ProjectRow | null> {
    const { data } = await this.ctx.supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()
    return data ?? null
  }

  async updateModule(projectId: string, tenantId: string, patch: Record<string, unknown>): Promise<ProjectRow> {
    const { data, error } = await this.ctx.supabase
      .from('projects')
      .update(patch as never)
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('*')
      .single()
    this.throwIfError(error)
    this.invalidateTable('projects')
    if (!data) this.notFound('Project')
    return data
  }

  async softDelete(projectId: string, tenantId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('projects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
    this.throwIfError(error)
    this.invalidateTable('projects')
  }

  async listModule(
    tenantId: string,
    filters?: {
      q?: string
      status?: string
      priority?: string
      healthStatus?: string
      freelancerId?: string
      companyId?: string
    },
    pagination?: PaginationParams
  ): Promise<PaginatedResult<ProjectRow>> {
    const { limit, offset, page } = this.paginate(pagination)
    let query = this.ctx.supabase
      .from('projects')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.priority) query = query.eq('priority', filters.priority as never)
    if (filters?.healthStatus) query = query.eq('health_status', filters.healthStatus as never)
    if (filters?.freelancerId) query = query.eq('freelancer_id', filters.freelancerId)
    if (filters?.companyId) query = query.eq('company_id', filters.companyId)
    if (filters?.q?.trim()) query = query.ilike('title', `%${filters.q.trim()}%`)

    const { data, count, error } = await query.range(offset, offset + limit - 1)
    this.throwIfError(error)
    return toPaginatedResult(data ?? [], { limit, page }, count ?? undefined)
  }

  async computeHealth(projectId: string) {
    const { data, error } = await this.ctx.supabase.rpc('compute_project_health', {
      p_project_id: projectId,
    })
    this.throwIfError(error)
    const row = (data as Array<Record<string, unknown>> | null)?.[0]
    if (!row) {
      return {
        health_score: 100,
        health_status: 'on_track',
        overdue_milestones: 0,
        overdue_tasks: 0,
        blocked_tasks: 0,
        open_deliverables: 0,
      }
    }
    return row
  }

  async refreshHealth(projectId: string, tenantId: string): Promise<void> {
    const health = await this.computeHealth(projectId)
    await this.updateModule(projectId, tenantId, {
      health_score: health.health_score,
      health_status: health.health_status,
    })
  }
}
