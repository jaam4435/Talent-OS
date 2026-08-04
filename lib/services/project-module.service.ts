import type { Repositories } from '@/lib/repositories/factory'
import type { Tables } from '@/modules/core/types/database'
import type { PaginatedResult } from '@/lib/repositories/base/types'
import type { ProjectStatus } from '@/modules/core/types/enums'
import type { NotificationService } from '@/lib/services/notification.service'
import {
  FREELANCER_STATUS_TRANSITIONS,
  MANAGER_STATUS_TRANSITIONS,
  PROJECT_EVENT_TYPES,
  type ProjectAsset,
  type ProjectComment,
  type ProjectDeliverable,
  type ProjectDependency,
  type ProjectHealth,
  type ProjectMilestone,
  type ProjectModuleSummary,
  type ProjectTask,
  type ProjectTemplate,
  type ProjectTimelineEvent,
} from '@/modules/project/types'

type ProjectRow = Tables<'projects'>

export function mapProjectSummary(row: ProjectRow): ProjectModuleSummary {
  return {
    id: row.id,
    title: row.title,
    status: row.status as ProjectStatus,
    priority: (row.priority as ProjectModuleSummary['priority']) ?? 'medium',
    deadline: row.deadline ?? null,
    clientName: row.client_name,
    freelancerId: row.freelancer_id,
    companyId: row.company_id ?? null,
    budget: row.budget,
    currency: row.currency,
    healthScore: row.health_score ?? 100,
    healthStatus: (row.health_status as ProjectModuleSummary['healthStatus']) ?? 'on_track',
    templateId: row.template_id ?? null,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class ProjectModuleService {
  constructor(
    private readonly repos: Repositories,
    private readonly notifications: NotificationService
  ) {}

  async listProjects(
    tenantId: string,
    options: {
      page?: number
      limit?: number
      q?: string
      status?: string
      priority?: string
      healthStatus?: string
      freelancerId?: string
      companyId?: string
    }
  ): Promise<PaginatedResult<ProjectModuleSummary>> {
    const result = await this.repos.project.listModule(
      tenantId,
      {
        q: options.q,
        status: options.status,
        priority: options.priority,
        healthStatus: options.healthStatus,
        freelancerId: options.freelancerId,
        companyId: options.companyId,
      },
      { page: options.page, limit: options.limit }
    )
    return {
      ...result,
      data: result.data.map(mapProjectSummary),
    }
  }

  async getProject(tenantId: string, id: string): Promise<ProjectModuleSummary | null> {
    const row = await this.repos.project.findModuleById(id, tenantId)
    return row ? mapProjectSummary(row) : null
  }

  async createProject(
    tenantId: string,
    actorId: string,
    input: Record<string, unknown>,
    defaultCurrency = 'USD'
  ): Promise<{ ok: true; project: ProjectModuleSummary } | { ok: false; error: string }> {
    const milestones = (input.milestones as Array<Record<string, unknown>>) ?? []
    if (!milestones.length) return { ok: false, error: 'At least one milestone is required' }

    const milestonesPayload = milestones.map((m, index) => ({
      title: m.title,
      description: m.description ?? '',
      amount: m.amount,
      due_date: m.due_date ?? '',
      priority: m.priority ?? 'medium',
      sort_order: index + 1,
      status: 'pending',
    }))

    let projectId: string
    try {
      projectId = await this.repos.project.createWithMilestones({
        tenantId,
        assignedBy: actorId,
        freelancerId: input.freelancer_id as string,
        title: input.title as string,
        milestones: milestonesPayload,
        opportunityId: (input.opportunity_id as string | null) ?? null,
        shortlistId: (input.shortlist_id as string | null) ?? null,
        description: (input.description as string | null) ?? null,
        clientName: (input.client_name as string | null) ?? null,
        budget: (input.budget as number | null) ?? null,
        currency: (input.currency as string) ?? defaultCurrency,
        status: (input.status as string) ?? 'active',
        companyId: (input.company_id as string | null) ?? null,
      })
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Create failed' }
    }

    const patch: Record<string, unknown> = {}
    if (input.priority) patch.priority = input.priority
    if (input.deadline) patch.deadline = input.deadline
    if (input.template_id) patch.template_id = input.template_id
    if (input.requirements) patch.requirements = input.requirements

    if (Object.keys(patch).length) {
      await this.repos.project.updateModule(projectId, tenantId, patch)
    }

    await this.repos.project.refreshHealth(projectId, tenantId)
    const project = await this.getProject(tenantId, projectId)

    await this.recordTimeline(tenantId, projectId, actorId, 'status_change', 'Project created', input.title as string)
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'project.created',
      entityType: 'project',
      entityId: projectId,
      eventType: PROJECT_EVENT_TYPES.CREATED,
      afterState: { title: input.title, status: input.status ?? 'active' },
    })

    await this.notifyFreelancer(tenantId, input.freelancer_id as string, 'New project assigned', String(input.title))

    return { ok: true, project: project! }
  }

  async updateProject(
    tenantId: string,
    actorId: string,
    id: string,
    patch: Record<string, unknown>
  ): Promise<{ ok: true; project: ProjectModuleSummary } | { ok: false; error: string }> {
    const current = await this.repos.project.findModuleById(id, tenantId)
    if (!current) return { ok: false, error: 'Project not found' }

    const dbPatch: Record<string, unknown> = {}
    const fields = [
      'title', 'description', 'client_name', 'company_id', 'budget', 'currency',
      'priority', 'deadline', 'template_id', 'requirements', 'ai_context',
    ]
    for (const f of fields) {
      if (f in patch) dbPatch[f] = patch[f]
    }

    const row = await this.repos.project.updateModule(id, tenantId, dbPatch)
    await this.repos.project.refreshHealth(id, tenantId)
    const updated = mapProjectSummary(await this.repos.project.findModuleById(id, tenantId) ?? row)

    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'project.updated',
      entityType: 'project',
      entityId: id,
      eventType: PROJECT_EVENT_TYPES.UPDATED,
      beforeState: { title: current.title, priority: current.priority },
      afterState: { title: updated.title, priority: updated.priority },
    })

    return { ok: true, project: updated }
  }

  async transitionStatus(
    tenantId: string,
    actorId: string,
    projectId: string,
    status: ProjectStatus,
    role: 'manager' | 'freelancer',
    userId?: string
  ): Promise<{ ok: true; project: ProjectModuleSummary } | { ok: false; error: string }> {
    const current = await this.repos.project.findModuleById(projectId, tenantId)
    if (!current) return { ok: false, error: 'Project not found' }

    if (role === 'freelancer') {
      if (!userId) return { ok: false, error: 'FORBIDDEN' }
      const freelancerUserId = await this.repos.talent.findUserIdByFreelancerId(current.freelancer_id)
      if (freelancerUserId !== userId) return { ok: false, error: 'FORBIDDEN' }
    }

    const transitions = role === 'manager' ? MANAGER_STATUS_TRANSITIONS : FREELANCER_STATUS_TRANSITIONS
    const allowed = transitions[current.status as ProjectStatus] ?? []
    if (!allowed.includes(status) && current.status !== status) {
      return { ok: false, error: `Cannot move from ${current.status} to ${status}` }
    }

    const patch: Record<string, unknown> = { status }
    if (status === 'active' && current.status === 'draft') patch.started_at = new Date().toISOString()
    if (status === 'completed') patch.completed_at = new Date().toISOString()

    await this.repos.project.updateModule(projectId, tenantId, patch)
    await this.repos.project.refreshHealth(projectId, tenantId)

    await this.recordTimeline(
      tenantId,
      projectId,
      actorId,
      'status_change',
      `Status changed to ${status}`,
      `${current.status} → ${status}`
    )
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'project.status_changed',
      entityType: 'project',
      entityId: projectId,
      eventType: PROJECT_EVENT_TYPES.STATUS_CHANGED,
      beforeState: { status: current.status },
      afterState: { status },
    })

    const project = await this.getProject(tenantId, projectId)
    return { ok: true, project: project! }
  }

  async deleteProject(
    tenantId: string,
    actorId: string,
    id: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const current = await this.repos.project.findModuleById(id, tenantId)
    if (!current) return { ok: false, error: 'Project not found' }

    await this.repos.project.softDelete(id, tenantId)
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'project.deleted',
      entityType: 'project',
      entityId: id,
      eventType: PROJECT_EVENT_TYPES.DELETED,
      beforeState: { title: current.title },
    })
    return { ok: true }
  }

  async getHealth(tenantId: string, projectId: string): Promise<ProjectHealth | null> {
    const project = await this.repos.project.findModuleById(projectId, tenantId)
    if (!project) return null

    const health = await this.repos.project.computeHealth(projectId)
    return {
      healthScore: Number(health.health_score),
      healthStatus: health.health_status as ProjectHealth['healthStatus'],
      overdueMilestones: Number(health.overdue_milestones),
      overdueTasks: Number(health.overdue_tasks),
      blockedTasks: Number(health.blocked_tasks),
      openDeliverables: Number(health.open_deliverables),
    }
  }

  async getTimeline(tenantId: string, projectId: string): Promise<ProjectTimelineEvent[]> {
    const project = await this.repos.project.findModuleById(projectId, tenantId)
    if (!project) return []
    return this.repos.projectTimeline.listByProject(projectId, tenantId)
  }

  async listMilestones(tenantId: string, projectId: string): Promise<ProjectMilestone[]> {
    const project = await this.repos.project.findModuleById(projectId, tenantId)
    if (!project) return []
    return this.repos.projectMilestone.listByProject(projectId)
  }

  async updateMilestone(
    tenantId: string,
    actorId: string,
    projectId: string,
    milestoneId: string,
    patch: Record<string, unknown>
  ): Promise<{ ok: true; milestone: ProjectMilestone } | { ok: false; error: string }> {
    const milestone = await this.repos.projectMilestone.findById(milestoneId, tenantId)
    if (!milestone || milestone.projectId !== projectId) return { ok: false, error: 'Milestone not found' }

    const updated = await this.repos.projectMilestone.update(milestoneId, tenantId, patch)
    await this.repos.project.refreshHealth(projectId, tenantId)

    if (patch.status === 'approved') {
      await this.recordTimeline(tenantId, projectId, actorId, 'milestone_completed', updated.title, 'Milestone approved')
    }

    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'project.milestone.updated',
      entityType: 'milestone',
      entityId: milestoneId,
      eventType: PROJECT_EVENT_TYPES.MILESTONE_UPDATED,
      beforeState: { status: milestone.status },
      afterState: { status: updated.status },
    })

    return { ok: true, milestone: updated }
  }

  async listTasks(tenantId: string, projectId: string): Promise<ProjectTask[]> {
    const project = await this.repos.project.findModuleById(projectId, tenantId)
    if (!project) return []
    return this.repos.projectTask.listByProject(projectId, tenantId)
  }

  async createTask(
    tenantId: string,
    actorId: string,
    projectId: string,
    input: Record<string, unknown>
  ): Promise<{ ok: true; task: ProjectTask } | { ok: false; error: string }> {
    const project = await this.repos.project.findModuleById(projectId, tenantId)
    if (!project) return { ok: false, error: 'Project not found' }

    const task = await this.repos.projectTask.create({
      tenant_id: tenantId,
      project_id: projectId,
      milestone_id: (input.milestone_id as string | null) ?? null,
      title: input.title as string,
      description: (input.description as string | null) ?? null,
      status: (input.status as never) ?? 'todo',
      priority: (input.priority as never) ?? 'medium',
      assignee_id: (input.assignee_id as string | null) ?? null,
      due_date: (input.due_date as string | null) ?? null,
      sort_order: (input.sort_order as number) ?? 0,
    })

    await this.repos.project.refreshHealth(projectId, tenantId)
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'project.task.created',
      entityType: 'task',
      entityId: task.id,
      eventType: PROJECT_EVENT_TYPES.TASK_CREATED,
      afterState: { title: task.title },
    })

    return { ok: true, task }
  }

  async updateTask(
    tenantId: string,
    actorId: string,
    projectId: string,
    taskId: string,
    patch: Record<string, unknown>
  ): Promise<{ ok: true; task: ProjectTask } | { ok: false; error: string }> {
    const current = await this.repos.projectTask.findById(taskId, tenantId)
    if (!current || current.projectId !== projectId) return { ok: false, error: 'Task not found' }

    const task = await this.repos.projectTask.update(taskId, tenantId, patch)
    await this.repos.project.refreshHealth(projectId, tenantId)

    if (patch.status === 'done') {
      await this.recordTimeline(tenantId, projectId, actorId, 'task_completed', task.title, 'Task completed')
      await this.auditAndEmit({
        tenantId,
        actorId,
        action: 'project.task.completed',
        entityType: 'task',
        entityId: taskId,
        eventType: PROJECT_EVENT_TYPES.TASK_COMPLETED,
        afterState: { title: task.title },
      })
    }

    return { ok: true, task }
  }

  async listDeliverables(tenantId: string, projectId: string): Promise<ProjectDeliverable[]> {
    const project = await this.repos.project.findModuleById(projectId, tenantId)
    if (!project) return []
    return this.repos.projectDeliverable.listByProject(projectId, tenantId)
  }

  async createDeliverable(
    tenantId: string,
    actorId: string,
    projectId: string,
    input: Record<string, unknown>
  ): Promise<{ ok: true; deliverable: ProjectDeliverable } | { ok: false; error: string }> {
    const project = await this.repos.project.findModuleById(projectId, tenantId)
    if (!project) return { ok: false, error: 'Project not found' }

    const deliverable = await this.repos.projectDeliverable.create({
      tenant_id: tenantId,
      project_id: projectId,
      milestone_id: (input.milestone_id as string | null) ?? null,
      task_id: (input.task_id as string | null) ?? null,
      title: input.title as string,
      description: (input.description as string | null) ?? null,
      status: (input.status as never) ?? 'draft',
      file_path: (input.file_path as string | null) ?? null,
    })

    if (deliverable.status === 'submitted') {
      await this.recordTimeline(tenantId, projectId, actorId, 'deliverable_submitted', deliverable.title, 'Deliverable submitted')
      await this.auditAndEmit({
        tenantId,
        actorId,
        action: 'project.deliverable.submitted',
        entityType: 'deliverable',
        entityId: deliverable.id,
        eventType: PROJECT_EVENT_TYPES.DELIVERABLE_SUBMITTED,
        afterState: { title: deliverable.title },
      })
    }

    await this.repos.project.refreshHealth(projectId, tenantId)
    return { ok: true, deliverable }
  }

  async updateDeliverable(
    tenantId: string,
    actorId: string,
    projectId: string,
    deliverableId: string,
    patch: Record<string, unknown>
  ): Promise<{ ok: true; deliverable: ProjectDeliverable } | { ok: false; error: string }> {
    const current = await this.repos.projectDeliverable.findById(deliverableId, tenantId)
    if (!current || current.projectId !== projectId) return { ok: false, error: 'Deliverable not found' }

    const deliverable = await this.repos.projectDeliverable.update(deliverableId, tenantId, patch)
    await this.repos.project.refreshHealth(projectId, tenantId)
    return { ok: true, deliverable }
  }

  async listAssets(tenantId: string, projectId: string): Promise<ProjectAsset[]> {
    const project = await this.repos.project.findModuleById(projectId, tenantId)
    if (!project) return []
    return this.repos.projectAsset.listByProject(projectId, tenantId)
  }

  async createAsset(
    tenantId: string,
    actorId: string,
    projectId: string,
    input: Record<string, unknown>
  ): Promise<{ ok: true; asset: ProjectAsset } | { ok: false; error: string }> {
    const project = await this.repos.project.findModuleById(projectId, tenantId)
    if (!project) return { ok: false, error: 'Project not found' }

    const asset = await this.repos.projectAsset.create({
      tenant_id: tenantId,
      project_id: projectId,
      asset_type: (input.asset_type as never) ?? 'file',
      name: input.name as string,
      file_path: (input.file_path as string | null) ?? null,
      url: (input.url as string | null) ?? null,
      mime_type: (input.mime_type as string | null) ?? null,
      size_bytes: (input.size_bytes as number | null) ?? null,
    })

    return { ok: true, asset }
  }

  async listComments(
    tenantId: string,
    projectId: string,
    entityType?: string,
    entityId?: string
  ): Promise<ProjectComment[]> {
    const project = await this.repos.project.findModuleById(projectId, tenantId)
    if (!project) return []
    return this.repos.projectComment.listByProject(projectId, tenantId, entityType, entityId)
  }

  async addComment(
    tenantId: string,
    actorId: string,
    projectId: string,
    input: { entity_type: string; entity_id: string; body: string }
  ): Promise<{ ok: true; comment: ProjectComment } | { ok: false; error: string }> {
    const project = await this.repos.project.findModuleById(projectId, tenantId)
    if (!project) return { ok: false, error: 'Project not found' }

    const comment = await this.repos.projectComment.create({
      tenant_id: tenantId,
      project_id: projectId,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      author_id: actorId,
      body: input.body,
    })

    await this.recordTimeline(tenantId, projectId, actorId, 'comment', 'Comment added', input.body.slice(0, 120))
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'project.comment.added',
      entityType: 'comment',
      entityId: comment.id,
      eventType: PROJECT_EVENT_TYPES.COMMENT_ADDED,
      afterState: { entityType: input.entity_type },
    })

    return { ok: true, comment }
  }

  async listDependencies(tenantId: string, projectId: string): Promise<ProjectDependency[]> {
    const project = await this.repos.project.findModuleById(projectId, tenantId)
    if (!project) return []
    return this.repos.projectDependency.listByProject(projectId, tenantId)
  }

  async addDependency(
    tenantId: string,
    actorId: string,
    projectId: string,
    input: Record<string, unknown>
  ): Promise<{ ok: true; dependency: ProjectDependency } | { ok: false; error: string }> {
    const project = await this.repos.project.findModuleById(projectId, tenantId)
    if (!project) return { ok: false, error: 'Project not found' }

    const dependency = await this.repos.projectDependency.create({
      tenant_id: tenantId,
      project_id: projectId,
      predecessor_type: input.predecessor_type as never,
      predecessor_id: input.predecessor_id as string,
      successor_type: input.successor_type as never,
      successor_id: input.successor_id as string,
      notes: (input.notes as string | null) ?? null,
    })

    await this.recordTimeline(tenantId, projectId, actorId, 'dependency_added', 'Dependency added', null)
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'project.dependency.added',
      entityType: 'dependency',
      entityId: dependency.id,
      eventType: PROJECT_EVENT_TYPES.DEPENDENCY_ADDED,
      afterState: {
        predecessor: `${dependency.predecessorType}:${dependency.predecessorId}`,
        successor: `${dependency.successorType}:${dependency.successorId}`,
      },
    })

    return { ok: true, dependency }
  }

  async listTemplates(tenantId: string): Promise<ProjectTemplate[]> {
    return this.repos.projectTemplate.list(tenantId)
  }

  async createTemplate(tenantId: string, actorId: string, input: Record<string, unknown>): Promise<ProjectTemplate> {
    return this.repos.projectTemplate.create({
      tenant_id: tenantId,
      name: input.name as string,
      description: (input.description as string | null) ?? null,
      default_milestones: (input.default_milestones as Array<Record<string, unknown>>) ?? [],
      default_tasks: (input.default_tasks as Array<Record<string, unknown>>) ?? [],
      is_active: input.is_active as boolean | undefined,
    })
  }

  async applyTemplate(
    tenantId: string,
    actorId: string,
    templateId: string,
    input: Record<string, unknown>,
    defaultCurrency = 'USD'
  ): Promise<{ ok: true; project: ProjectModuleSummary } | { ok: false; error: string }> {
    const template = await this.repos.projectTemplate.findById(templateId, tenantId)
    if (!template) return { ok: false, error: 'Template not found' }

    const milestones = template.defaultMilestones.map((m) => ({
      title: String(m.title ?? 'Milestone'),
      description: m.description ?? null,
      amount: Number(m.amount ?? 0),
      due_date: m.due_date ?? null,
      priority: m.priority ?? 'medium',
    }))

    if (!milestones.length) {
      milestones.push({ title: 'Kickoff', description: null, amount: 0, due_date: null, priority: 'medium' })
    }

    const result = await this.createProject(
      tenantId,
      actorId,
      {
        freelancer_id: input.freelancer_id,
        title: input.title ?? template.name,
        template_id: templateId,
        company_id: input.company_id ?? null,
        deadline: input.deadline ?? null,
        milestones,
      },
      defaultCurrency
    )

    if (!result.ok) return result

    for (const [index, task] of template.defaultTasks.entries()) {
      await this.repos.projectTask.create({
        tenant_id: tenantId,
        project_id: result.project.id,
        title: String(task.title ?? `Task ${index + 1}`),
        description: (task.description as string | null) ?? null,
        priority: (task.priority as never) ?? 'medium',
        sort_order: index,
      })
    }

    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'project.template.applied',
      entityType: 'project',
      entityId: result.project.id,
      eventType: PROJECT_EVENT_TYPES.TEMPLATE_APPLIED,
      afterState: { templateId, templateName: template.name },
    })

    return result
  }

  async listAuditLogs(tenantId: string, options: Parameters<typeof this.repos.projectAudit.list>[1]) {
    return this.repos.projectAudit.list(tenantId, options)
  }

  private async recordTimeline(
    tenantId: string,
    projectId: string,
    actorId: string,
    eventType: ProjectTimelineEvent['eventType'],
    title: string,
    description: string | null
  ) {
    await this.repos.projectTimeline.record({
      tenant_id: tenantId,
      project_id: projectId,
      event_type: eventType,
      title,
      description,
      actor_id: actorId,
    })
  }

  private async notifyFreelancer(tenantId: string, freelancerId: string, title: string, body: string) {
    const userId = await this.repos.talent.findUserIdByFreelancerId(freelancerId)
    if (!userId) return
    await this.notifications.create({
      tenant_id: tenantId,
      user_id: userId,
      type: 'system',
      title,
      body,
      data: { freelancer_id: freelancerId },
    })
  }

  private async auditAndEmit(input: {
    tenantId: string
    actorId: string
    action: string
    entityType: string
    entityId: string
    eventType: string
    beforeState?: Record<string, unknown> | null
    afterState?: Record<string, unknown> | null
  }) {
    await this.repos.projectAudit.record({
      tenant_id: input.tenantId,
      actor_id: input.actorId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      before_state: input.beforeState ?? null,
      after_state: input.afterState ?? null,
    })

    await this.repos.domainEvent.emit({
      tenantId: input.tenantId,
      eventType: input.eventType,
      aggregateType: input.entityType,
      aggregateId: input.entityId,
      idempotencyKey: `${input.eventType}:${input.entityId}:${Date.now()}`,
      actorId: input.actorId,
      payload: {
        action: input.action,
        before: input.beforeState ?? null,
        after: input.afterState ?? null,
      },
    })
  }
}
