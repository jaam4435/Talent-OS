/** Workflow engine type definitions. */

export type WorkflowQueue =
  | 'default'
  | 'integrations'
  | 'ai'
  | 'notifications'
  | 'approvals'

export type ConditionOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'exists'

export interface WorkflowCondition {
  field: string
  operator: ConditionOperator
  value?: unknown
}

export type WorkflowActionType =
  | 'dispatch_n8n'
  | 'execute_ai'
  | 'notify'
  | 'emit_event'
  | 'log_activity'
  | 'request_approval'

export type ApproverRole = 'project_manager' | 'tenant_admin' | 'assigned_by'

export interface ActionStep {
  id: string
  type: 'action'
  action: WorkflowActionType
  config?: Record<string, unknown>
  maxRetries?: number
  queue?: WorkflowQueue
}

export interface ApprovalStep {
  id: string
  type: 'approval'
  config: {
    approverRole: ApproverRole
    title: string
    body?: string
    expiresInHours?: number
    onApproved?: ActionStep[]
    onRejected?: ActionStep[]
  }
  queue?: WorkflowQueue
}

export type WorkflowStep = ActionStep | ApprovalStep

export interface DomainEventTrigger {
  type: 'domain_event'
  eventType: string
}

export interface WorkflowDefinition {
  id: string
  name: string
  description?: string
  trigger: DomainEventTrigger
  conditions?: WorkflowCondition[]
  queue?: WorkflowQueue
  steps: WorkflowStep[]
}

export interface WorkflowTriggerContext {
  tenantId: string
  eventId: string
  eventType: string
  aggregateType: string
  aggregateId: string
  payload: Record<string, unknown>
  actorId: string | null
  correlationId: string
  idempotencyKey: string
}

export interface ActionExecutionContext extends WorkflowTriggerContext {
  runId: string
  jobId: string
  stepId: string
  config: Record<string, unknown>
}

export interface ActionResult {
  ok: boolean
  error?: string
  output?: Record<string, unknown>
  waitForApproval?: boolean
}

export type WorkflowRunStatus =
  | 'pending'
  | 'running'
  | 'waiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type WorkflowJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired'
