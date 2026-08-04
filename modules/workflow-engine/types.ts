import type { WorkflowDefinition, WorkflowQueue, WorkflowStep } from '@/lib/workflows/types'

export type WorkflowDefinitionCategory = 'business' | 'integration' | 'notification' | 'ai' | 'custom'

export interface WorkflowDefinitionRecord {
  id: string
  tenantId: string | null
  name: string
  description: string | null
  category: WorkflowDefinitionCategory
  triggerEventType: string
  conditions: Record<string, unknown>[]
  steps: WorkflowStep[]
  compensation: WorkflowStep[]
  queueName: WorkflowQueue
  isBuiltin: boolean
  isActive: boolean
  version: number
  createdAt: string
  updatedAt: string
}

export interface WorkflowRunRecord {
  id: string
  tenantId: string
  workflowId: string
  triggerEventId: string | null
  triggerEventType: string
  status: string
  context: Record<string, unknown>
  currentStepId: string | null
  correlationId: string
  startedAt: string | null
  completedAt: string | null
  lastError: string | null
  createdAt: string
}

export interface WorkflowJobRecord {
  id: string
  tenantId: string
  runId: string
  stepId: string
  queueName: string
  actionType: string
  config: Record<string, unknown>
  status: string
  retryCount: number
  maxRetries: number
  lastError: string | null
  scheduledAt: string
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

export interface WorkflowExecutionHistoryEntry {
  id: string
  tenantId: string
  runId: string
  jobId: string | null
  stepId: string
  actionType: string
  status: 'started' | 'completed' | 'failed' | 'skipped' | 'compensated'
  input: Record<string, unknown>
  output: Record<string, unknown>
  error: string | null
  durationMs: number | null
  createdAt: string
}

export interface WorkflowCompensationRecord {
  id: string
  tenantId: string
  runId: string
  jobId: string | null
  stepId: string
  actionType: string
  config: Record<string, unknown>
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'
  retryCount: number
  maxRetries: number
  lastError: string | null
  scheduledAt: string
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

export interface WorkflowAuditEntry {
  id: string
  action: string
  entityType: string
  entityId: string
  actorId: string | null
  beforeState: Record<string, unknown> | null
  afterState: Record<string, unknown> | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface WorkflowObservabilitySummary {
  totalRuns: number
  runningRuns: number
  failedRuns: number
  pendingJobs: number
  deadLetterJobs: number
  pendingCompensations: number
  avgDurationMs: number
}

export const WORKFLOW_EVENT_TYPES = {
  RUN_STARTED: 'workflow.run.started',
  RUN_COMPLETED: 'workflow.run.completed',
  RUN_FAILED: 'workflow.run.failed',
  STEP_STARTED: 'workflow.step.started',
  STEP_COMPLETED: 'workflow.step.completed',
  STEP_FAILED: 'workflow.step.failed',
  COMPENSATION_TRIGGERED: 'workflow.compensation.triggered',
  COMPENSATION_COMPLETED: 'workflow.compensation.completed',
  RETRY_REQUESTED: 'workflow.retry.requested',
  DEFINITION_CREATED: 'workflow.definition.created',
  DEFINITION_UPDATED: 'workflow.definition.updated',
} as const

export const BUSINESS_WORKFLOW_IDS = {
  LEAD_QUALIFICATION: 'wf-lead-qualification',
  CLIENT_ONBOARDING: 'wf-client-onboarding',
  PROJECT_CREATION: 'wf-project-creation',
  TALENT_MATCHING: 'wf-talent-matching',
  ASSIGNMENT: 'wf-assignment',
  QA: 'wf-qa',
  DELIVERY: 'wf-delivery',
  INVOICE: 'wf-invoice',
  PROJECT_CLOSURE: 'wf-project-closure',
} as const

export type BusinessWorkflowId = (typeof BUSINESS_WORKFLOW_IDS)[keyof typeof BUSINESS_WORKFLOW_IDS]

export interface BusinessWorkflowMeta {
  id: BusinessWorkflowId
  name: string
  description: string
  definition: WorkflowDefinition
}
