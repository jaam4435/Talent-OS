import type { Repositories } from '@/lib/repositories/factory'
import type { MilestoneStatus } from '@/modules/core/types/enums'
import type { NotificationService } from '@/lib/services/notification.service'

export class WorkflowService {
  constructor(
    private readonly repos: Repositories,
    private readonly notifications: NotificationService
  ) {}

  async emitEvent(input: import('@/lib/repositories/domain-event.repository').EmitDomainEventInput) {
    return this.repos.domainEvent.emit(input)
  }

  async markEventProcessing(eventId: string): Promise<void> {
    await this.repos.domainEvent.markProcessing(eventId)
  }

  async markEventDelivered(eventId: string): Promise<void> {
    await this.repos.domainEvent.markDelivered(eventId)
  }

  async markEventFailed(eventId: string, error: string): Promise<void> {
    await this.repos.domainEvent.markFailed(eventId, error)
  }

  async listPendingForDispatch(limit = 50) {
    return this.repos.domainEvent.listPendingForDispatch(limit)
  }

  async claimForDispatch(limit = 50) {
    return this.repos.domainEvent.claimForDispatch(limit)
  }

  async updateMilestoneStatus(
    milestoneId: string,
    tenantId: string,
    status: MilestoneStatus,
    userId: string,
    isManager: boolean
  ): Promise<{ ok: true; projectId: string } | { ok: false; error: string }> {
    const milestone = await this.repos.task.findSummary(milestoneId, tenantId)
    if (!milestone) return { ok: false, error: 'Milestone not found' }

    if (!isManager) {
      if (status !== 'in_progress') return { ok: false, error: 'FORBIDDEN' }
      const project = await this.repos.project.findSummary(milestone.project_id, tenantId)
      if (!project) return { ok: false, error: 'Project not found' }

      const freelancerUserId = await this.repos.talent.findUserIdByFreelancerId(project.freelancer_id)
      if (freelancerUserId !== userId) return { ok: false, error: 'FORBIDDEN' }
    }

    try {
      await this.repos.task.update(milestoneId, { status, updated_at: new Date().toISOString() })
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Update failed' }
    }

    return { ok: true, projectId: milestone.project_id }
  }

  async submitMilestone(
    milestoneId: string,
    tenantId: string,
    userId: string,
    submissionNote?: string
  ): Promise<{ ok: true; projectId: string } | { ok: false; error: string }> {
    const milestone = await this.repos.task.findSummary(milestoneId, tenantId)
    if (!milestone) return { ok: false, error: 'Milestone not found' }

    const project = await this.repos.project.findById(milestone.project_id, tenantId)
    if (!project) return { ok: false, error: 'Project not found' }

    const freelancerUserId = await this.repos.talent.findUserIdByFreelancerId(project.freelancer_id)
    if (freelancerUserId !== userId) {
      return { ok: false, error: 'Only the assigned freelancer can submit' }
    }

    if (!['pending', 'in_progress', 'revision'].includes(milestone.status)) {
      return { ok: false, error: 'Milestone cannot be submitted in its current state' }
    }

    try {
      await this.repos.task.submit(milestoneId, submissionNote ?? null)
      await this.repos.project.updateStatus(milestone.project_id, { status: 'in_review' })
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Submit failed' }
    }

    await this.repos.activityLog.create({
      tenant_id: tenantId,
      actor_id: userId,
      entity_type: 'project',
      entity_id: milestone.project_id,
      action: 'milestone_submitted',
      metadata: { milestone_id: milestoneId, milestone_title: milestone.title },
    })

    if (project.assigned_by) {
      await this.notifications.create({
        tenant_id: tenantId,
        user_id: project.assigned_by,
        type: 'milestone_submitted',
        title: 'Milestone submitted for review',
        body: `"${milestone.title}" on ${project.title} was submitted.`,
        data: { project_id: project.id, milestone_id: milestoneId },
      })
    }

    await this.emitEvent({
      tenantId,
      eventType: 'milestone.submitted',
      aggregateType: 'milestone',
      aggregateId: milestoneId,
      idempotencyKey: `milestone-submitted:${milestoneId}`,
      actorId: userId,
      payload: {
        milestone_id: milestoneId,
        project_id: milestone.project_id,
        project_title: project.title,
      },
    })

    return { ok: true, projectId: milestone.project_id }
  }

  async reviewMilestone(
    milestoneId: string,
    tenantId: string,
    userId: string,
    action: 'approve' | 'revision',
    reviewNote?: string
  ): Promise<{ ok: true; projectId: string } | { ok: false; error: string }> {
    if (action === 'revision' && !reviewNote?.trim()) {
      return { ok: false, error: 'Revision feedback is required' }
    }

    const milestone = await this.repos.task.findSummary(milestoneId, tenantId)
    if (!milestone) return { ok: false, error: 'Milestone not found' }

    if (milestone.status !== 'submitted') {
      return { ok: false, error: 'Only submitted milestones can be reviewed' }
    }

    const newStatus = action === 'approve' ? 'approved' : 'revision'

    try {
      await this.repos.task.review(milestoneId, newStatus as MilestoneStatus, userId, reviewNote ?? null)
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Review failed' }
    }

    await this.repos.activityLog.create({
      tenant_id: tenantId,
      actor_id: userId,
      entity_type: 'project',
      entity_id: milestone.project_id,
      action: action === 'approve' ? 'milestone_approved' : 'milestone_revision_requested',
      metadata: {
        milestone_id: milestoneId,
        milestone_title: milestone.title,
        review_note: reviewNote ?? null,
      },
    })

    const project = await this.repos.project.findById(milestone.project_id, tenantId)
    const freelancerUserId = project
      ? await this.repos.talent.findUserIdByFreelancerId(project.freelancer_id)
      : null

    if (freelancerUserId) {
      await this.notifications.create({
        tenant_id: tenantId,
        user_id: freelancerUserId,
        type: action === 'approve' ? 'milestone_approved' : 'milestone_revision',
        title: action === 'approve' ? 'Milestone approved' : 'Revision requested',
        body:
          action === 'approve'
            ? `"${milestone.title}" was approved.`
            : `Revision requested on "${milestone.title}": ${reviewNote}`,
        data: { project_id: milestone.project_id, milestone_id: milestoneId },
      })
    }

    if (action === 'approve') {
      const remaining = await this.repos.task.countNonApprovedByProject(milestone.project_id)
      if (remaining === 0) {
        await this.repos.project.updateStatus(milestone.project_id, {
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
      } else {
        await this.repos.project.updateStatus(milestone.project_id, { status: 'active' })
      }

      await this.emitEvent({
        tenantId,
        eventType: 'milestone.approved',
        aggregateType: 'milestone',
        aggregateId: milestoneId,
        idempotencyKey: `milestone-approved:${milestoneId}`,
        actorId: userId,
        payload: {
          milestone_id: milestoneId,
          project_id: milestone.project_id,
          project_title: project?.title,
        },
      })
    } else {
      await this.repos.project.updateStatus(milestone.project_id, { status: 'active' })

      await this.emitEvent({
        tenantId,
        eventType: 'milestone.revision_requested',
        aggregateType: 'milestone',
        aggregateId: milestoneId,
        idempotencyKey: `milestone-revision:${milestoneId}`,
        actorId: userId,
        payload: {
          milestone_id: milestoneId,
          project_id: milestone.project_id,
          project_title: project?.title,
          review_note: reviewNote ?? null,
        },
      })
    }

    return { ok: true, projectId: milestone.project_id }
  }

  async listOverdueMilestones(now: string) {
    return this.repos.task.listOverdue(now)
  }

  async findEventByIdempotencyKey(idempotencyKey: string) {
    return this.repos.domainEvent.findByIdempotencyKey(idempotencyKey)
  }

  async logActivity(input: {
    tenant_id: string
    actor_id: string | null
    entity_type: string
    entity_id: string
    action: string
    metadata?: Record<string, unknown>
  }) {
    await this.repos.activityLog.create(input)
  }

  async findSubmittableMilestone(freelancerId: string, tenantId: string) {
    return this.repos.task.findSubmittableForFreelancer(freelancerId, tenantId)
  }

  async listEvents(
    tenantId: string,
    filters?: { status?: string; aggregateType?: string; aggregateId?: string; limit?: number }
  ) {
    return this.repos.domainEvent.listByTenant(tenantId, {
      status: filters?.status,
      aggregateType: filters?.aggregateType,
      aggregateId: filters?.aggregateId,
      limit: filters?.limit,
    })
  }

  async getEventById(eventId: string, tenantId: string) {
    return this.repos.domainEvent.findById(eventId, tenantId)
  }

  async dispatchN8n(
    tenantId: string,
    workflow: string,
    payload: Record<string, unknown>,
    actorId?: string
  ) {
    const { buildN8nEnvelope, dispatchToN8n } = await import('@/lib/integrations/n8n')
    const envelope = buildN8nEnvelope({
      event: workflow,
      tenantId,
      data: payload,
      idempotencyKey: `mcp-n8n:${workflow}:${crypto.randomUUID()}`,
      actorId: actorId ?? null,
    })
    return dispatchToN8n(envelope)
  }

  async sendWhatsApp(
    tenantId: string,
    input: { to: string; template?: string; parameters?: string[]; body?: string },
    actorId: string
  ) {
    return this.emitEvent({
      tenantId,
      eventType: 'whatsapp.send_requested',
      aggregateType: 'whatsapp',
      aggregateId: input.to,
      idempotencyKey: `whatsapp-send:${input.to}:${Date.now()}`,
      actorId,
      payload: {
        to: input.to,
        template: input.template ?? null,
        parameters: input.parameters ?? [],
        body: input.body ?? null,
      },
    })
  }
}

export type EmitEventInput = import('@/lib/repositories/domain-event.repository').EmitDomainEventInput
