import { describe, expect, it, vi } from 'vitest'
import { WorkflowEngineModuleService } from '@/lib/services/workflow-engine-module.service'
import { BUSINESS_WORKFLOW_IDS } from '@/modules/workflow-engine/types'
import { findWorkflowById } from '@/lib/workflows/registry'

describe('WorkflowEngineModuleService', () => {
  it('lists nine reusable business workflows', () => {
    const service = new WorkflowEngineModuleService({} as never, {} as never)
    const builtins = service.listBuiltinDefinitions()
    expect(builtins).toHaveLength(9)
    expect(builtins.map((w) => w.id)).toContain(BUSINESS_WORKFLOW_IDS.LEAD_QUALIFICATION)
    expect(builtins.map((w) => w.id)).toContain(BUSINESS_WORKFLOW_IDS.PROJECT_CLOSURE)
  })

  it('returns registry definition by id', () => {
    const service = new WorkflowEngineModuleService({} as never, {} as never)
    const result = service.getDefinition(BUSINESS_WORKFLOW_IDS.ASSIGNMENT)
    expect(result?.source).toBe('registry')
    expect(result?.definition.id).toBe(BUSINESS_WORKFLOW_IDS.ASSIGNMENT)
  })

  it('retries failed jobs with audit trail', async () => {
    const workflowEngine = { retryFailedJobs: vi.fn(async () => undefined) }
    const repos = {
      workflowAudit: { record: vi.fn(async () => undefined) },
      domainEvent: { emit: vi.fn(async () => 'event-1') },
    }
    const service = new WorkflowEngineModuleService(repos as never, workflowEngine as never)

    await service.retryJobs('tenant-1', 'user-1', ['job-1'])

    expect(workflowEngine.retryFailedJobs).toHaveBeenCalledWith(['job-1'])
    expect(repos.workflowAudit.record).toHaveBeenCalled()
  })

  it('manual trigger emits domain event and starts workflow', async () => {
    const definition = findWorkflowById(BUSINESS_WORKFLOW_IDS.PROJECT_CREATION)
    expect(definition).toBeDefined()

    const workflowEngine = {
      triggerFromDomainEvent: vi.fn(async () => [{ workflowId: definition!.id, runId: 'run-1' }]),
    }
    const repos = {
      domainEvent: {
        emit: vi.fn(async () => 'event-1'),
        findById: vi.fn(async () => ({
          id: 'event-1',
          tenant_id: 'tenant-1',
          event_type: definition!.trigger.eventType,
          aggregate_type: 'project',
          aggregate_id: 'proj-1',
          payload: {},
          actor_id: 'user-1',
          correlation_id: 'corr-1',
          idempotency_key: 'key-1',
        })),
      },
      workflowAudit: { record: vi.fn(async () => undefined) },
    }

    const service = new WorkflowEngineModuleService(repos as never, workflowEngine as never)
    const result = await service.triggerManual('tenant-1', 'user-1', {
      workflowId: definition!.id,
      aggregateType: 'project',
      aggregateId: 'proj-1',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.runs[0].runId).toBe('run-1')
    }
  })
})

describe('Business workflow registry', () => {
  it('registers all business workflows in global registry', () => {
    for (const id of Object.values(BUSINESS_WORKFLOW_IDS)) {
      expect(findWorkflowById(id)).toBeDefined()
    }
  })

  it('includes compensation steps for saga rollback', () => {
    const assignment = findWorkflowById(BUSINESS_WORKFLOW_IDS.ASSIGNMENT)
    expect(assignment?.compensation?.length).toBeGreaterThan(0)
  })
})
