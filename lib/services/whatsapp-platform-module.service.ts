import type { Repositories } from '@/lib/repositories/factory'
import type { PaginatedResult } from '@/lib/repositories/base/types'
import type { CRMService } from '@/lib/services/crm.service'
import type { WhatsAppService } from '@/lib/services/whatsapp.service'
import type { ProjectModuleService } from '@/lib/services/project-module.service'
import type { AssignmentModuleService } from '@/lib/services/assignment-module.service'
import type { WorkflowService } from '@/lib/services/workflow.service'
import type { WorkflowEngineModuleService } from '@/lib/services/workflow-engine-module.service'
import type { NotificationService } from '@/lib/services/notification.service'
import type { TalentService } from '@/lib/services/talent.service'
import type { Services } from '@/lib/services/factory'
import type {
  InboundProcessResult,
  ParsedWhatsAppMessage,
} from '@/lib/whatsapp/types'
import {
  WHATSAPP_EVENT_TYPES,
  type WhatsAppAuditEntry,
  type WhatsAppCommandInput,
  type WhatsAppConversationSummary,
  type WhatsAppMemoryEntry,
  type WhatsAppObservabilitySummary,
  type WhatsAppPlatformIntent,
} from '@/modules/whatsapp-platform/types'

export class WhatsAppPlatformModuleService {
  constructor(
    private readonly repos: Repositories,
    private readonly whatsapp: WhatsAppService,
    private readonly crm: CRMService,
    private readonly projectModule: ProjectModuleService,
    private readonly assignmentModule: AssignmentModuleService,
    private readonly workflow: WorkflowService,
    private readonly workflowEngineModule: WorkflowEngineModuleService,
    private readonly notification: NotificationService,
    private readonly talent: TalentService
  ) {}

  async listConversations(
    tenantId: string,
    options: { page?: number; limit?: number }
  ): Promise<PaginatedResult<WhatsAppConversationSummary>> {
    return this.repos.whatsappConversation.list(tenantId, options)
  }

  async getConversation(
    tenantId: string,
    freelancerId: string
  ): Promise<WhatsAppConversationSummary | null> {
    return this.repos.whatsappConversation.getByFreelancer(tenantId, freelancerId)
  }

  async listAuditLogs(
    tenantId: string,
    options: Parameters<typeof this.repos.whatsappAudit.list>[1]
  ): Promise<PaginatedResult<WhatsAppAuditEntry>> {
    return this.repos.whatsappAudit.list(tenantId, options)
  }

  async listMemory(
    tenantId: string,
    freelancerId: string,
    options: { page?: number; limit?: number }
  ): Promise<PaginatedResult<WhatsAppMemoryEntry>> {
    return this.repos.whatsappMemory.list(tenantId, freelancerId, options)
  }

  async getObservabilitySummary(tenantId: string): Promise<WhatsAppObservabilitySummary> {
    return this.repos.whatsappConversation.getModuleSummary(tenantId)
  }

  async listPendingApprovals(userId: string, tenantId: string) {
    const [workflowApprovals, gates] = await Promise.all([
      this.workflowEngineModule.listPendingApprovals(userId, tenantId),
      this.repos.whatsappApprovalGate.listPending(tenantId),
    ])
    return { workflowApprovals, whatsappGates: gates }
  }

  async processInboundMessage(input: {
    message: ParsedWhatsAppMessage
    tenantId: string
    freelancer: { id: string; full_name: string }
    services: Services
  }): Promise<InboundProcessResult> {
    const result = await this.whatsapp.processInboundMessage(input)

    await this.repos.whatsappMemory.append({
      tenant_id: input.tenantId,
      freelancer_id: input.freelancer.id,
      role: 'user',
      content: input.message.body,
      intent: result.intent,
      metadata: { wa_message_id: input.message.waMessageId },
    })

    if (result.handler.handled) {
      await this.audit({
        tenantId: input.tenantId,
        freelancerId: input.freelancer.id,
        action: `whatsapp.intent.${result.intent}`,
        entityType: 'freelancer',
        entityId: input.freelancer.id,
        waMessageId: input.message.waMessageId,
        afterState: result.handler.data as Record<string, unknown>,
        metadata: { intent: result.intent },
      })
    }

    return result
  }

  async createOpportunity(
    tenantId: string,
    actorId: string,
    tenantCurrency: string,
    input: {
      title: string
      description?: string
      budget?: number
      requiredSkills?: string[]
      companyId?: string
    }
  ) {
    const result = await this.crm.createOpportunity(tenantId, actorId, tenantCurrency, {
      title: input.title,
      description: input.description,
      budget: input.budget,
      requiredSkills: input.requiredSkills ?? [],
      companyId: input.companyId,
      status: 'draft',
    })

    if (result.ok) {
      await this.audit({
        tenantId,
        actorId,
        action: 'whatsapp.opportunity.created',
        entityType: 'opportunity',
        entityId: result.opportunityId,
        afterState: { title: input.title },
      })
    }

    return result
  }

  async approveProject(
    tenantId: string,
    actorId: string,
    projectId: string,
    targetStatus: 'active' | 'completed' = 'active'
  ) {
    const result = await this.projectModule.transitionStatus(
      tenantId,
      actorId,
      projectId,
      targetStatus,
      'manager'
    )

    if (result.ok) {
      await this.audit({
        tenantId,
        actorId,
        action: 'whatsapp.project.approved',
        entityType: 'project',
        entityId: projectId,
        afterState: { status: targetStatus },
      })
    }

    return result
  }

  async acceptAssignment(tenantId: string, actorId: string, allocationId: string) {
    const result = await this.assignmentModule.updateAllocation(tenantId, actorId, allocationId, {
      status: 'confirmed',
    })

    if (result.ok) {
      await this.audit({
        tenantId,
        actorId,
        action: 'whatsapp.assignment.accepted',
        entityType: 'allocation',
        entityId: allocationId,
        afterState: { status: 'confirmed' },
      })
    }

    return result
  }

  async rejectAssignment(tenantId: string, actorId: string, allocationId: string) {
    const result = await this.assignmentModule.cancelAllocation(tenantId, actorId, allocationId)

    if (result.ok) {
      await this.audit({
        tenantId,
        actorId,
        action: 'whatsapp.assignment.rejected',
        entityType: 'allocation',
        entityId: allocationId,
        afterState: { status: 'canceled' },
      })
    }

    return result
  }

  async requestRevision(
    tenantId: string,
    actorId: string,
    milestoneId: string,
    reviewNote: string
  ) {
    const result = await this.workflow.reviewMilestone(
      milestoneId,
      tenantId,
      actorId,
      'revision',
      reviewNote
    )

    if (result.ok) {
      await this.audit({
        tenantId,
        actorId,
        action: 'whatsapp.milestone.revision_requested',
        entityType: 'milestone',
        entityId: milestoneId,
        afterState: { review_note: reviewNote },
      })
    }

    return result
  }

  async approveMilestone(tenantId: string, actorId: string, milestoneId: string) {
    const result = await this.workflow.reviewMilestone(milestoneId, tenantId, actorId, 'approve')

    if (result.ok) {
      await this.audit({
        tenantId,
        actorId,
        action: 'whatsapp.milestone.approved',
        entityType: 'milestone',
        entityId: milestoneId,
      })
    }

    return result
  }

  async sendDeliverable(
    tenantId: string,
    actorId: string,
    projectId: string,
    input: { title: string; description?: string; deliverableId?: string }
  ) {
    if (input.deliverableId) {
      const result = await this.projectModule.updateDeliverable(
        tenantId,
        actorId,
        projectId,
        input.deliverableId,
        { status: 'submitted', submitted_at: new Date().toISOString() }
      )
      if (result.ok) {
        await this.audit({
          tenantId,
          actorId,
          action: 'whatsapp.deliverable.submitted',
          entityType: 'deliverable',
          entityId: input.deliverableId,
          afterState: { title: input.title },
        })
      }
      return result
    }

    const result = await this.projectModule.createDeliverable(tenantId, actorId, projectId, {
      title: input.title,
      description: input.description ?? null,
      status: 'submitted',
    })

    if (result.ok) {
      await this.audit({
        tenantId,
        actorId,
        action: 'whatsapp.deliverable.submitted',
        entityType: 'deliverable',
        entityId: result.deliverable.id,
        afterState: { title: input.title },
      })
    }

    return result
  }

  async sendNotification(
    tenantId: string,
    actorId: string,
    input: { userId: string; type: string; title: string; body: string; data?: Record<string, unknown> }
  ) {
    await this.notification.create({
      tenant_id: tenantId,
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ?? {},
    })

    await this.audit({
      tenantId,
      actorId,
      action: WHATSAPP_EVENT_TYPES.NOTIFICATION_SENT,
      entityType: 'notification',
      entityId: input.userId,
      afterState: { type: input.type, title: input.title },
    })

    return { ok: true as const }
  }

  async triggerWorkflow(
    tenantId: string,
    actorId: string,
    input: {
      workflowId: string
      aggregateType: string
      aggregateId: string
      payload?: Record<string, unknown>
    }
  ) {
    const result = await this.workflowEngineModule.triggerManual(tenantId, actorId, {
      workflowId: input.workflowId,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      payload: input.payload,
    })

    if (result.ok) {
      await this.audit({
        tenantId,
        actorId,
        action: WHATSAPP_EVENT_TYPES.WORKFLOW_TRIGGERED,
        entityType: input.aggregateType,
        entityId: input.aggregateId,
        metadata: { workflowId: input.workflowId },
      })
    }

    return result
  }

  async resolveApproval(
    tenantId: string,
    actorId: string,
    approvalId: string,
    decision: 'approved' | 'rejected',
    note?: string
  ) {
    const result = await this.workflowEngineModule.resolveApproval(
      tenantId,
      actorId,
      approvalId,
      decision,
      note
    )

    if (result.ok) {
      const gate = await this.repos.whatsappApprovalGate.listPending(tenantId)
      const match = gate.find((g) => g.approvalRequestId === approvalId)
      if (match) {
        await this.repos.whatsappApprovalGate.resolve(match.id, tenantId)
      }

      await this.audit({
        tenantId,
        actorId,
        action: WHATSAPP_EVENT_TYPES.APPROVAL_RESOLVED,
        entityType: 'approval_request',
        entityId: approvalId,
        afterState: { decision, note: note ?? null },
      })
    }

    return result
  }

  async registerApprovalGate(input: {
    tenantId: string
    approvalRequestId: string
    freelancerId?: string
    phone?: string
  }) {
    return this.repos.whatsappApprovalGate.create({
      tenant_id: input.tenantId,
      approval_request_id: input.approvalRequestId,
      freelancer_id: input.freelancerId ?? null,
      phone: input.phone ?? null,
    })
  }

  async executeCommand(
    tenantId: string,
    actorId: string,
    tenantCurrency: string,
    command: WhatsAppCommandInput
  ): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
    const entityId = command.entityId ?? command.payload?.entity_id as string | undefined

    switch (command.intent as WhatsAppPlatformIntent) {
      case 'opportunity.create': {
        const payload = command.payload ?? {}
        const result = await this.createOpportunity(tenantId, actorId, tenantCurrency, {
          title: (payload.title as string) ?? 'WhatsApp opportunity',
          description: payload.description as string | undefined,
          budget: payload.budget as number | undefined,
          requiredSkills: (payload.required_skills as string[]) ?? [],
          companyId: payload.company_id as string | undefined,
        })
        return result.ok
          ? { ok: true, data: { opportunity_id: result.opportunityId } }
          : { ok: false, error: result.error }
      }
      case 'project.approve': {
        if (!entityId) return { ok: false, error: 'entity_id required' }
        const result = await this.approveProject(tenantId, actorId, entityId)
        return result.ok
          ? { ok: true, data: { project_id: entityId, status: result.project.status } }
          : { ok: false, error: result.error }
      }
      case 'assignment.accept': {
        if (!entityId) return { ok: false, error: 'entity_id required' }
        const result = await this.acceptAssignment(tenantId, actorId, entityId)
        return result.ok
          ? { ok: true, data: { allocation_id: entityId, status: result.allocation.status } }
          : { ok: false, error: result.error }
      }
      case 'assignment.reject': {
        if (!entityId) return { ok: false, error: 'entity_id required' }
        const result = await this.rejectAssignment(tenantId, actorId, entityId)
        return result.ok ? { ok: true, data: { allocation_id: entityId } } : { ok: false, error: result.error }
      }
      case 'milestone.revision': {
        if (!entityId) return { ok: false, error: 'entity_id required' }
        const note = command.note ?? (command.payload?.note as string) ?? 'Revision requested via WhatsApp'
        const result = await this.requestRevision(tenantId, actorId, entityId, note)
        return result.ok ? { ok: true, data: { milestone_id: entityId } } : { ok: false, error: result.error }
      }
      case 'milestone.approve': {
        if (!entityId) return { ok: false, error: 'entity_id required' }
        const result = await this.approveMilestone(tenantId, actorId, entityId)
        return result.ok ? { ok: true, data: { milestone_id: entityId } } : { ok: false, error: result.error }
      }
      case 'deliverable.submit': {
        const projectId = (command.payload?.project_id as string) ?? entityId
        if (!projectId) return { ok: false, error: 'project_id required' }
        const result = await this.sendDeliverable(tenantId, actorId, projectId, {
          title: (command.payload?.title as string) ?? 'Deliverable',
          description: command.payload?.description as string | undefined,
          deliverableId: command.payload?.deliverable_id as string | undefined,
        })
        return result.ok
          ? { ok: true, data: { deliverable_id: result.deliverable.id } }
          : { ok: false, error: result.error }
      }
      case 'approval.approve':
      case 'approval.reject': {
        if (!entityId) return { ok: false, error: 'entity_id required' }
        const decision = command.intent === 'approval.approve' ? 'approved' : 'rejected'
        const result = await this.resolveApproval(tenantId, actorId, entityId, decision, command.note)
        return result.ok ? { ok: true, data: { approval_id: entityId, decision } } : { ok: false, error: result.error ?? 'Approval failed' }
      }
      case 'workflow.trigger': {
        const payload = command.payload ?? {}
        const result = await this.triggerWorkflow(tenantId, actorId, {
          workflowId: payload.workflow_id as string,
          aggregateType: (payload.aggregate_type as string) ?? command.entityType ?? 'project',
          aggregateId: (payload.aggregate_id as string) ?? entityId ?? '',
          payload: payload.payload as Record<string, unknown> | undefined,
        })
        return result.ok ? { ok: true, data: { runs: result.runs } } : { ok: false, error: result.error ?? 'Trigger failed' }
      }
      case 'notification.send': {
        const payload = command.payload ?? {}
        await this.sendNotification(tenantId, actorId, {
          userId: payload.user_id as string,
          type: (payload.type as string) ?? 'whatsapp',
          title: (payload.title as string) ?? 'Notification',
          body: (payload.body as string) ?? '',
          data: payload.data as Record<string, unknown> | undefined,
        })
        return { ok: true, data: { sent: true } }
      }
      default:
        return { ok: false, error: `Command intent not supported via API: ${command.intent}` }
    }
  }

  async recordAssistantMemory(
    tenantId: string,
    freelancerId: string,
    content: string,
    intent?: string
  ) {
    return this.repos.whatsappMemory.append({
      tenant_id: tenantId,
      freelancer_id: freelancerId,
      role: 'assistant',
      content,
      intent: intent ?? null,
    })
  }

  async getRecentMemory(tenantId: string, freelancerId: string, limit = 10) {
    return this.repos.whatsappMemory.recent(tenantId, freelancerId, limit)
  }

  private async audit(input: {
    tenantId: string
    actorId?: string | null
    freelancerId?: string | null
    action: string
    entityType: string
    entityId: string
    beforeState?: Record<string, unknown> | null
    afterState?: Record<string, unknown> | null
    metadata?: Record<string, unknown>
    waMessageId?: string | null
  }) {
    await this.repos.whatsappAudit.record({
      tenant_id: input.tenantId,
      actor_id: input.actorId ?? null,
      freelancer_id: input.freelancerId ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      before_state: input.beforeState,
      after_state: input.afterState,
      metadata: input.metadata,
      wa_message_id: input.waMessageId ?? null,
    })
  }
}
