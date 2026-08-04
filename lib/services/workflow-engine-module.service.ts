import type { Repositories } from '@/lib/repositories/factory'
import type { PaginatedResult } from '@/lib/repositories/base/types'
import type { WorkflowEngineService } from '@/lib/services/workflow-engine.service'
import {
  BUSINESS_WORKFLOW_CATALOG,
  BUSINESS_WORKFLOW_DEFINITIONS,
} from '@/modules/workflow-engine/business-workflows'
import {
  WORKFLOW_EVENT_TYPES,
  type WorkflowAuditEntry,
  type WorkflowCompensationRecord,
  type WorkflowDefinitionRecord,
  type WorkflowExecutionHistoryEntry,
  type WorkflowJobRecord,
  type WorkflowObservabilitySummary,
  type WorkflowRunRecord,
} from '@/modules/workflow-engine/types'
import { findWorkflowById, listAllWorkflowDefinitions } from '@/lib/workflows/registry'

export class WorkflowEngineModuleService {
  constructor(
    private readonly repos: Repositories,
    private readonly workflowEngine: WorkflowEngineService
  ) {}

  listBuiltinDefinitions() {
    return BUSINESS_WORKFLOW_CATALOG.map(({ id, name, description, definition }) => ({
      id,
      name,
      description,
      triggerEventType: definition.trigger.eventType,
      queue: definition.queue ?? 'default',
      stepCount: definition.steps.length,
      hasCompensation: (definition.compensation?.length ?? 0) > 0,
    }))
  }

  listRegistryDefinitions() {
    return listAllWorkflowDefinitions().map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description ?? null,
      triggerEventType: d.trigger.eventType,
      queue: d.queue ?? 'default',
      stepCount: d.steps.length,
      hasCompensation: (d.compensation?.length ?? 0) > 0,
      isBusinessWorkflow: BUSINESS_WORKFLOW_DEFINITIONS.some((b) => b.id === d.id),
    }))
  }

  getDefinition(workflowId: string) {
    const registry = findWorkflowById(workflowId)
    if (registry) return { source: 'registry' as const, definition: registry }
    return null
  }

  async listStoredDefinitions(
    tenantId: string,
    options: Parameters<typeof this.repos.workflowDefinition.list>[1]
  ): Promise<PaginatedResult<WorkflowDefinitionRecord>> {
    return this.repos.workflowDefinition.list(tenantId, options)
  }

  async createCustomDefinition(
    tenantId: string,
    actorId: string,
    input: Record<string, unknown>
  ): Promise<WorkflowDefinitionRecord> {
    const record = await this.repos.workflowDefinition.upsert({
      tenant_id: tenantId,
      id: input.id as string,
      name: input.name as string,
      description: (input.description as string | null) ?? null,
      trigger_event_type: input.trigger_event_type as string,
      conditions: (input.conditions as Record<string, unknown>[]) ?? [],
      steps: input.steps as Record<string, unknown>[],
      compensation: (input.compensation as Record<string, unknown>[]) ?? [],
      queue_name: (input.queue_name as string) ?? 'default',
      is_builtin: false,
      is_active: true,
    })

    await this.audit({
      tenantId,
      actorId,
      action: WORKFLOW_EVENT_TYPES.DEFINITION_CREATED,
      entityType: 'workflow_definition',
      entityId: record.id,
      afterState: { name: record.name, triggerEventType: record.triggerEventType },
    })

    return record
  }

  async listRuns(
    tenantId: string,
    options: Parameters<typeof this.repos.workflow.listRuns>[1]
  ): Promise<PaginatedResult<WorkflowRunRecord>> {
    return this.repos.workflow.listRuns(tenantId, options)
  }

  async getRun(tenantId: string, runId: string): Promise<WorkflowRunRecord | null> {
    const run = await this.repos.workflow.findRunById(runId)
    if (!run || run.tenant_id !== tenantId) return null
    return {
      id: run.id,
      tenantId: run.tenant_id,
      workflowId: run.workflow_id,
      triggerEventId: run.trigger_event_id,
      triggerEventType: run.trigger_event_type,
      status: run.status,
      context: (run.context as Record<string, unknown>) ?? {},
      currentStepId: run.current_step_id,
      correlationId: run.correlation_id,
      startedAt: run.started_at,
      completedAt: run.completed_at,
      lastError: run.last_error,
      createdAt: run.created_at,
    }
  }

  async listJobs(
    tenantId: string,
    options: Parameters<typeof this.repos.workflow.listJobs>[1]
  ): Promise<PaginatedResult<WorkflowJobRecord>> {
    return this.repos.workflow.listJobs(tenantId, options)
  }

  async listExecutionHistory(
    tenantId: string,
    options: Parameters<typeof this.repos.workflowExecutionHistory.list>[1]
  ): Promise<PaginatedResult<WorkflowExecutionHistoryEntry>> {
    return this.repos.workflowExecutionHistory.list(tenantId, options)
  }

  async listCompensations(
    tenantId: string,
    options: Parameters<typeof this.repos.workflowCompensation.list>[1]
  ): Promise<PaginatedResult<WorkflowCompensationRecord>> {
    return this.repos.workflowCompensation.list(tenantId, options)
  }

  async retryJobs(tenantId: string, actorId: string, jobIds: string[]) {
    await this.workflowEngine.retryFailedJobs(jobIds)
    await this.audit({
      tenantId,
      actorId,
      action: WORKFLOW_EVENT_TYPES.RETRY_REQUESTED,
      entityType: 'workflow_job',
      entityId: jobIds.join(','),
      metadata: { jobIds, target: 'jobs' },
    })
  }

  async retryEvents(tenantId: string, actorId: string, eventIds: string[]) {
    await this.workflowEngine.retryFailedEvents(eventIds)
    await this.audit({
      tenantId,
      actorId,
      action: WORKFLOW_EVENT_TYPES.RETRY_REQUESTED,
      entityType: 'domain_event',
      entityId: eventIds.join(','),
      metadata: { eventIds, target: 'events' },
    })
  }

  async retryCompensations(tenantId: string, actorId: string, compensationIds: string[]) {
    await this.repos.workflowCompensation.retry(compensationIds)
    await this.audit({
      tenantId,
      actorId,
      action: WORKFLOW_EVENT_TYPES.RETRY_REQUESTED,
      entityType: 'workflow_compensation',
      entityId: compensationIds.join(','),
      metadata: { compensationIds, target: 'compensations' },
    })
  }

  async triggerManual(
    tenantId: string,
    actorId: string,
    input: {
      workflowId: string
      aggregateType: string
      aggregateId: string
      payload?: Record<string, unknown>
      idempotencyKey?: string
    }
  ) {
    const definition = findWorkflowById(input.workflowId)
    if (!definition) return { ok: false as const, error: 'Workflow definition not found' }

    const idempotencyKey =
      input.idempotencyKey ?? `manual:${input.workflowId}:${input.aggregateId}:${Date.now()}`
    const correlationId = crypto.randomUUID()

    const eventId = await this.repos.domainEvent.emit({
      tenantId,
      eventType: definition.trigger.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      idempotencyKey,
      correlationId,
      actorId,
      payload: input.payload ?? {},
    })

    if (!eventId) return { ok: false as const, error: 'Failed to create trigger event' }

    const event = await this.repos.domainEvent.findById(eventId)
    if (!event) return { ok: false as const, error: 'Failed to load trigger event' }

    const started = await this.workflowEngine.triggerFromDomainEvent({
      id: event.id,
      tenant_id: event.tenant_id,
      event_type: event.event_type,
      aggregate_type: event.aggregate_type,
      aggregate_id: event.aggregate_id,
      payload: (event.payload as Record<string, unknown> | null) ?? {},
      actor_id: event.actor_id,
      correlation_id: event.correlation_id,
      idempotency_key: event.idempotency_key,
    })

    const match = started.find((s) => s.workflowId === input.workflowId)
    await this.audit({
      tenantId,
      actorId,
      action: WORKFLOW_EVENT_TYPES.RUN_STARTED,
      entityType: 'workflow_run',
      entityId: match?.runId ?? started[0]?.runId ?? eventId,
      metadata: { workflowId: input.workflowId, manual: true },
    })

    return { ok: true as const, eventId, runs: started }
  }

  async getObservabilitySummary(tenantId: string): Promise<WorkflowObservabilitySummary> {
    const row = await this.repos.workflow.getModuleSummary(tenantId)
    return {
      totalRuns: Number(row?.total_runs ?? 0),
      runningRuns: Number(row?.running_runs ?? 0),
      failedRuns: Number(row?.failed_runs ?? 0),
      pendingJobs: Number(row?.pending_jobs ?? 0),
      deadLetterJobs: Number(row?.dead_letter_jobs ?? 0),
      pendingCompensations: Number(row?.pending_compensations ?? 0),
      avgDurationMs: Number(row?.avg_duration_ms ?? 0),
    }
  }

  async listAuditLogs(
    tenantId: string,
    options: Parameters<typeof this.repos.workflowAudit.list>[1]
  ): Promise<PaginatedResult<WorkflowAuditEntry>> {
    return this.repos.workflowAudit.list(tenantId, options)
  }

  async resolveApproval(
    tenantId: string,
    actorId: string,
    approvalId: string,
    decision: 'approved' | 'rejected',
    note?: string
  ) {
    const result = await this.workflowEngine.resolveApproval(approvalId, actorId, decision, note)
    if (result.ok) {
      await this.audit({
        tenantId,
        actorId,
        action: `workflow.approval.${decision}`,
        entityType: 'approval_request',
        entityId: approvalId,
        metadata: { note },
      })
    }
    return result
  }

  async listPendingApprovals(userId: string, tenantId: string) {
    return this.workflowEngine.listPendingApprovals(userId, tenantId)
  }

  private async audit(input: {
    tenantId: string
    actorId: string
    action: string
    entityType: string
    entityId: string
    beforeState?: Record<string, unknown> | null
    afterState?: Record<string, unknown> | null
    metadata?: Record<string, unknown>
  }) {
    await this.repos.workflowAudit.record({
      tenant_id: input.tenantId,
      actor_id: input.actorId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      before_state: input.beforeState,
      after_state: input.afterState,
      metadata: input.metadata,
    })
    await this.repos.domainEvent.emit({
      tenantId: input.tenantId,
      eventType: input.action,
      aggregateType: input.entityType,
      aggregateId: input.entityId,
      idempotencyKey: `${input.action}:${input.entityId}:${Date.now()}`,
      actorId: input.actorId,
      payload: input.metadata ?? {},
    })
  }
}
