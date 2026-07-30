import { evaluateConditions } from '@/lib/workflows/conditions'
import { findWorkflowsForEvent } from '@/lib/workflows/registry'
import { executeWorkflowAction } from '@/lib/workflows/actions'
import type {
  ActionStep,
  ApprovalStep,
  WorkflowStep,
  WorkflowTriggerContext,
} from '@/lib/workflows/types'
import type { Services } from '@/lib/services/factory'
import type { WorkflowRepository } from '@/lib/repositories/workflow.repository'

export class WorkflowEngine {
  constructor(
    private readonly repos: WorkflowRepository,
    private readonly getServices: () => Promise<Services>
  ) {}

  /** Match domain events to workflow definitions and enqueue first steps. */
  async triggerFromDomainEvent(event: {
    id: string
    tenant_id: string
    event_type: string
    aggregate_type: string
    aggregate_id: string
    payload: Record<string, unknown> | null
    actor_id: string | null
    correlation_id: string
    idempotency_key: string
  }): Promise<Array<{ workflowId: string; runId: string }>> {
    const context: WorkflowTriggerContext = {
      tenantId: event.tenant_id,
      eventId: event.id,
      eventType: event.event_type,
      aggregateType: event.aggregate_type,
      aggregateId: event.aggregate_id,
      payload: event.payload ?? {},
      actorId: event.actor_id,
      correlationId: event.correlation_id,
      idempotencyKey: event.idempotency_key,
    }

    const definitions = findWorkflowsForEvent(event.event_type)
    const started: Array<{ workflowId: string; runId: string }> = []

    for (const definition of definitions) {
      if (!evaluateConditions(definition.conditions, context)) continue

      const existing = await this.repos.findRunByTrigger(event.tenant_id, event.id, definition.id)
      if (existing) {
        started.push({ workflowId: definition.id, runId: existing.id })
        continue
      }

      const runId = await this.repos.createRun({
        tenant_id: event.tenant_id,
        workflow_id: definition.id,
        trigger_event_id: event.id,
        trigger_event_type: event.event_type,
        context: context as unknown as Record<string, unknown>,
        correlation_id: event.correlation_id,
      })

      await this.repos.updateRunStatus(runId, 'running', { started_at: new Date().toISOString() })
      await this.enqueueSteps(runId, event.tenant_id, definition.steps, context, definition.queue ?? 'default')
      started.push({ workflowId: definition.id, runId })
    }

    return started
  }

  /** Process pending background jobs across all queues. */
  async processJobQueue(limit = 50, queueName?: string) {
    const jobs = await this.repos.listPendingJobs(limit, queueName)
    const services = await this.getServices()
    const results: Array<{ jobId: string; ok: boolean; error?: string }> = []

    for (const job of jobs) {
      const claimed = await this.repos.markJobProcessing(job.id)
      if (!claimed) continue

      const run = await this.repos.findRunById(job.run_id)
      if (!run) {
        await this.repos.markJobFailed(job.id, 'Workflow run not found')
        results.push({ jobId: job.id, ok: false, error: 'Workflow run not found' })
        continue
      }

      const context = run.context as unknown as WorkflowTriggerContext
      const actionCtx = {
        ...context,
        runId: run.id,
        jobId: job.id,
        stepId: job.step_id,
        config: { action: job.action_type, ...(job.config as Record<string, unknown>) },
      }

      if (job.action_type === 'request_approval') {
        results.push({ jobId: job.id, ok: true })
        continue
      }

      const result = await executeWorkflowAction(services, actionCtx)

      if (result.waitForApproval) {
        results.push({ jobId: job.id, ok: true })
        continue
      }

      if (result.ok) {
        await this.repos.markJobCompleted(job.id)
        await this.advanceRun(run.id, job.step_id)
        results.push({ jobId: job.id, ok: true })
      } else {
        await this.repos.markJobFailed(job.id, result.error ?? 'Action failed')
        results.push({ jobId: job.id, ok: false, error: result.error })
      }
    }

    return { processed: results.length, results }
  }

  /** Create approval request and pause the run. */
  async createApprovalGate(input: {
    tenantId: string
    runId: string
    jobId: string
    step: ApprovalStep
    context: WorkflowTriggerContext
  }): Promise<string> {
    const services = await this.getServices()
    const approverId = await this.resolveApprover(services, input.context, input.step.config.approverRole)

    const approvalId = await this.repos.createApproval({
      tenant_id: input.tenantId,
      run_id: input.runId,
      job_id: input.jobId,
      approver_id: approverId,
      approver_role: input.step.config.approverRole,
      title: input.step.config.title,
      body: input.step.config.body ?? null,
      entity_type: input.context.aggregateType,
      entity_id: input.context.aggregateId,
      metadata: input.context.payload,
      expires_at: input.step.config.expiresInHours
        ? new Date(Date.now() + input.step.config.expiresInHours * 3600_000).toISOString()
        : null,
    })

    await this.repos.updateRunStatus(input.runId, 'waiting_approval', {
      current_step_id: input.step.id,
    })
    await this.repos.markJobCompleted(input.jobId)

    return approvalId
  }

  /** Resume workflow after human approval decision. */
  async resolveApproval(
    approvalId: string,
    userId: string,
    decision: 'approved' | 'rejected',
    note?: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const approval = await this.repos.findApprovalById(approvalId)
    if (!approval) return { ok: false, error: 'Approval not found' }
    if (approval.status !== 'pending') return { ok: false, error: 'Approval already decided' }

    const authorized = await this.canUserDecideApproval(approval, userId)
    if (!authorized) {
      return { ok: false, error: 'Not authorized to decide this approval' }
    }

    await this.repos.updateApproval(approvalId, {
      status: decision,
      decided_at: new Date().toISOString(),
      decided_by: userId,
      decision_note: note ?? null,
    })

    const run = await this.repos.findRunById(approval.run_id)
    if (!run) return { ok: false, error: 'Workflow run not found' }

    const { findWorkflowById } = await import('@/lib/workflows/registry')
    const definition = findWorkflowById(run.workflow_id)
    if (!definition) return { ok: false, error: 'Workflow definition not found' }

    const step = definition.steps.find((s) => s.id === run.current_step_id && s.type === 'approval') as
      | ApprovalStep
      | undefined

    const context = run.context as unknown as WorkflowTriggerContext
    const followUp = decision === 'approved' ? step?.config.onApproved : step?.config.onRejected

    if (followUp?.length) {
      await this.repos.updateRunStatus(run.id, 'running')
      await this.enqueueSteps(run.id, run.tenant_id, followUp, context, definition.queue ?? 'default')
    } else {
      await this.repos.updateRunStatus(run.id, 'completed', {
        completed_at: new Date().toISOString(),
      })
    }

    return { ok: true }
  }

  private async enqueueSteps(
    runId: string,
    tenantId: string,
    steps: WorkflowStep[],
    context: WorkflowTriggerContext,
    defaultQueue: string
  ) {
    for (const step of steps) {
      if (step.type === 'approval') {
        const jobId = await this.repos.createJob({
          tenant_id: tenantId,
          run_id: runId,
          step_id: step.id,
          queue_name: step.queue ?? defaultQueue,
          action_type: 'request_approval',
          config: step.config as unknown as Record<string, unknown>,
          max_retries: 0,
        })
        await this.createApprovalGate({
          tenantId,
          runId,
          jobId,
          step,
          context,
        })
        return
      }

      await this.repos.createJob({
        tenant_id: tenantId,
        run_id: runId,
        step_id: step.id,
        queue_name: step.queue ?? defaultQueue,
        action_type: step.action,
        config: step.config ?? {},
        max_retries: step.maxRetries ?? 5,
      })
    }
  }

  private async advanceRun(runId: string, completedStepId: string) {
    const pending = await this.repos.countPendingJobsForRun(runId)
    if (pending === 0) {
      await this.repos.updateRunStatus(runId, 'completed', {
        completed_at: new Date().toISOString(),
        current_step_id: completedStepId,
      })
    }
  }

  private async canUserDecideApproval(
    approval: {
      approver_id: string | null
      approver_role: string | null
      tenant_id: string
    },
    userId: string
  ): Promise<boolean> {
    if (approval.approver_id) {
      return approval.approver_id === userId
    }

    if (!approval.approver_role) {
      return false
    }

    if (approval.approver_role === 'project_manager' || approval.approver_role === 'assigned_by') {
      return false
    }

    if (approval.approver_role === 'tenant_admin') {
      const role = await this.repos.findMemberRole(approval.tenant_id, userId)
      return role === 'admin'
    }

    return false
  }

  private async resolveApprover(
    services: Services,
    context: WorkflowTriggerContext,
    role: ApprovalStep['config']['approverRole']
  ): Promise<string | null> {
    if (role === 'assigned_by' || role === 'project_manager') {
      const projectId = (context.payload.project_id as string) ?? context.aggregateId
      const project = await services.project.findAssignedBy(projectId)
      return project?.assigned_by ?? null
    }
    return context.actorId
  }
}
