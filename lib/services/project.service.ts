import { isDomainError } from '@/modules/core/utils/errors'
import type { Repositories } from '@/lib/repositories/factory'
import type { CreateProjectInput } from '@/lib/projects/types'
import {
  FREELANCER_STATUS_TRANSITIONS,
  MANAGER_STATUS_TRANSITIONS,
} from '@/lib/projects/types'
import type { MilestoneRow } from '@/lib/projects/types'
import type { ProjectStatus } from '@/modules/core/types/enums'
import type { WorkflowService } from '@/lib/services/workflow.service'

function mapRpcError(message: string): string {
  if (message.includes('MILESTONES_REQUIRED')) return 'At least one milestone is required.'
  if (message.includes('MILESTONE_BUDGET_EXCEEDED')) return 'Milestone amounts exceed the project budget.'
  if (message.includes('OPPORTUNITY_NOT_FOUND')) return 'Opportunity not found.'
  if (message.includes('FREELANCER_NOT_FOUND')) return 'Freelancer not found.'
  if (message.includes('FORBIDDEN')) return 'You do not have permission to create projects.'
  if (message.includes('COMPANY_NOT_FOUND')) return 'Company not found.'
  return message
}

export class ProjectService {
  constructor(
    private readonly repos: Repositories,
    private readonly workflow: WorkflowService
  ) {}

  async createProject(input: {
    tenantId: string
    tenantCurrency: string
    assignedBy: string
    data: CreateProjectInput
  }): Promise<{ ok: true; projectId: string } | { ok: false; error: string }> {
    const milestonesPayload = input.data.milestones.map((m, index) => ({
      title: m.title,
      description: m.description ?? '',
      amount: m.amount,
      due_date: m.dueDate ?? '',
      sort_order: index + 1,
      status: 'pending',
    }))

    let projectId: string
    try {
      projectId = await this.repos.project.createWithMilestones({
        tenantId: input.tenantId,
        assignedBy: input.assignedBy,
        freelancerId: input.data.freelancerId,
        title: input.data.title,
        milestones: milestonesPayload,
        opportunityId: input.data.opportunityId ?? null,
        shortlistId: input.data.shortlistId ?? null,
        description: input.data.description ?? null,
        clientName: input.data.clientName ?? null,
        budget: input.data.budget ?? null,
        currency: input.data.currency ?? input.tenantCurrency,
        status: input.data.status ?? 'active',
        companyId: input.data.companyId ?? null,
      })
    } catch (error) {
      const message = isDomainError(error) ? error.message : error instanceof Error ? error.message : 'Unknown error'
      return { ok: false, error: mapRpcError(message) }
    }

    const [freelancer, firstMilestoneDue] = await Promise.all([
      this.repos.talent.findContactById(input.data.freelancerId),
      this.repos.task.findFirstDueDate(projectId),
    ])

    await this.workflow.emitEvent({
      tenantId: input.tenantId,
      eventType: 'project.assigned',
      aggregateType: 'project',
      aggregateId: projectId,
      idempotencyKey: `project-assigned:${projectId}`,
      actorId: input.assignedBy,
      payload: {
        project_id: projectId,
        freelancer_id: input.data.freelancerId,
        freelancer_name: freelancer?.full_name,
        freelancer_email: freelancer?.email,
        freelancer_phone: freelancer?.phone,
        title: input.data.title,
        first_milestone_due: firstMilestoneDue,
        project_url: `${process.env.NEXT_PUBLIC_APP_URL}/projects/${projectId}`,
      },
    })

    return { ok: true, projectId }
  }

  async updateProjectStatus(
    projectId: string,
    tenantId: string,
    status: ProjectStatus,
    role: 'manager' | 'freelancer',
    userId?: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const project = await this.repos.project.findSummary(projectId, tenantId)
    if (!project) return { ok: false, error: 'Project not found' }

    if (role === 'freelancer') {
      if (!userId) return { ok: false, error: 'FORBIDDEN' }
      const freelancerUserId = await this.repos.talent.findUserIdByFreelancerId(project.freelancer_id)
      if (freelancerUserId !== userId) return { ok: false, error: 'FORBIDDEN' }

      const allowed = FREELANCER_STATUS_TRANSITIONS[project.status as ProjectStatus] ?? []
      if (!allowed.includes(status)) {
        return { ok: false, error: `Cannot move project to ${status}` }
      }

      try {
        await this.repos.project.updateStatus(projectId, { status })
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'Update failed' }
      }
      return { ok: true }
    }

    const allowed = MANAGER_STATUS_TRANSITIONS[project.status as ProjectStatus] ?? []
    if (!allowed.includes(status) && project.status !== status) {
      return { ok: false, error: `Cannot move from ${project.status} to ${status}` }
    }

    const patch: Record<string, unknown> = { status }
    if (status === 'active' && project.status === 'draft') {
      patch.started_at = new Date().toISOString()
    }
    if (status === 'completed') {
      patch.completed_at = new Date().toISOString()
    }

    try {
      await this.repos.project.updateStatus(projectId, patch)
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Update failed' }
    }

    return { ok: true }
  }

  async getProjectsForPage(tenantId: string, role: string, userId: string) {
    let freelancerId: string | undefined
    if (role === 'freelancer') {
      freelancerId = (await this.repos.talent.findIdByUserId(userId, tenantId)) ?? undefined
      if (!freelancerId) {
        return { projects: [], freelancerMap: new Map<string, { full_name: string }>() }
      }
    }

    const result = await this.repos.project.listByTenant(tenantId, { freelancerId })
    const freelancerIds = [...new Set(result.data.map((p) => p.freelancer_id))]
    const freelancers = await this.repos.talent.findNamesByIds(freelancerIds)
    const freelancerMap = new Map(freelancers.map((f) => [f.id, f]))

    return {
      projects: result.data.map((p) => ({
        ...p,
        status: p.status as ProjectStatus,
      })),
      freelancerMap,
    }
  }

  async getProjectDetail(projectId: string, tenantId: string) {
    const project = await this.repos.project.findById(projectId, tenantId)
    if (!project) return null

    const [milestones, freelancer, activity] = await Promise.all([
      this.repos.task.listByProject(projectId),
      this.repos.talent.findContactById(project.freelancer_id),
      this.repos.activityLog.listByEntity('project', projectId, 10),
    ])

    return { project, milestones, freelancer, activity }
  }

  mapMilestones(
    milestones: NonNullable<Awaited<ReturnType<ProjectService['getProjectDetail']>>>['milestones']
  ): MilestoneRow[] {
    return milestones.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      amount: Number(m.amount),
      dueDate: m.due_date,
      status: m.status as MilestoneRow['status'],
      sortOrder: m.sort_order,
      submissionNote: m.submission_note,
      submittedAt: m.submitted_at,
      reviewNote: m.review_note,
    }))
  }

  async getNewProjectFormData(tenantId: string, opportunityId?: string) {
    const [freelancers, companies] = await Promise.all([
      this.repos.talent.listForProjectForm(tenantId),
      this.repos.company.listByTenant(tenantId),
    ])

    if (!opportunityId) {
      return { freelancers, companies, defaults: null as null }
    }

    const opportunity = await this.repos.lead.findForProjectDefaults(opportunityId, tenantId)
    if (!opportunity) return { freelancers, companies, defaults: null }

    const shortlistId = await this.repos.shortlist.findIdByOpportunity(opportunityId)

    return {
      freelancers,
      companies,
      defaults: {
        title: opportunity.title,
        description: opportunity.description ?? undefined,
        clientName: opportunity.client_name ?? undefined,
        companyId: opportunity.company_id ?? undefined,
        budget: opportunity.budget ?? undefined,
        currency: opportunity.currency,
        shortlistId: shortlistId ?? undefined,
        opportunity,
      },
    }
  }

  async getProjectsForFreelancerDashboard(freelancerId: string) {
    const result = await this.repos.project.listForFreelancer(freelancerId)
    return result.data
  }

  async getClientDashboardProjects(tenantId: string, companyId: string | null) {
    const result = await this.repos.project.listByTenant(
      tenantId,
      companyId ? { companyId } : undefined,
      { limit: 10 }
    )
    return result.data
  }
}
