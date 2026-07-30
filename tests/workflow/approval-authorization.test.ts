import { describe, expect, it, vi } from 'vitest'
import { WorkflowEngine } from '@/lib/workflows/engine'
import type { WorkflowRepository } from '@/lib/repositories/workflow.repository'
import type { Services } from '@/lib/services/factory'

vi.mock('@/lib/workflows/registry', () => ({
  findWorkflowById: vi.fn(() => ({
    id: 'wf-test',
    steps: [{ id: 'step-1', type: 'approval', config: { approverRole: 'tenant_admin', title: 'Test' } }],
    queue: 'default',
  })),
}))

const APPROVAL_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const RUN_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const TENANT_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const APPROVER_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
const OTHER_USER_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'

function createMockWorkflowRepo(overrides: Partial<WorkflowRepository> = {}): WorkflowRepository {
  return {
    findApprovalById: vi.fn(),
    findMemberRole: vi.fn(),
    updateApproval: vi.fn(),
    findRunById: vi.fn(),
    updateRunStatus: vi.fn(),
    createJob: vi.fn(),
    ...overrides,
  } as unknown as WorkflowRepository
}

function createEngine(repos: WorkflowRepository) {
  const getServices = vi.fn(async () => ({}) as Services)
  return new WorkflowEngine(repos, getServices)
}

describe('WorkflowEngine.resolveApproval', () => {
  it('rejects when approver_id is null and role is user-specific', async () => {
    const repos = createMockWorkflowRepo({
      findApprovalById: vi.fn().mockResolvedValue({
        id: APPROVAL_ID,
        tenant_id: TENANT_ID,
        run_id: RUN_ID,
        status: 'pending',
        approver_id: null,
        approver_role: 'project_manager',
        current_step_id: 'step-1',
      }),
    })

    const engine = createEngine(repos)
    const result = await engine.resolveApproval(APPROVAL_ID, OTHER_USER_ID, 'approved')

    expect(result).toEqual({ ok: false, error: 'Not authorized to decide this approval' })
    expect(repos.updateApproval).not.toHaveBeenCalled()
  })

  it('allows assigned approver to decide', async () => {
    const repos = createMockWorkflowRepo({
      findApprovalById: vi.fn().mockResolvedValue({
        id: APPROVAL_ID,
        tenant_id: TENANT_ID,
        run_id: RUN_ID,
        status: 'pending',
        approver_id: APPROVER_ID,
        approver_role: 'project_manager',
        current_step_id: 'step-1',
      }),
      findRunById: vi.fn().mockResolvedValue({
        id: RUN_ID,
        tenant_id: TENANT_ID,
        workflow_id: 'wf-test',
        current_step_id: 'step-1',
        context: {},
      }),
      updateApproval: vi.fn().mockResolvedValue(undefined),
      updateRunStatus: vi.fn().mockResolvedValue(undefined),
    })

    const engine = createEngine(repos)
    const result = await engine.resolveApproval(APPROVAL_ID, APPROVER_ID, 'approved')

    expect(result).toEqual({ ok: true })
    expect(repos.updateApproval).toHaveBeenCalled()
  })

  it('allows tenant_admin role fallback for admins', async () => {
    const repos = createMockWorkflowRepo({
      findApprovalById: vi.fn().mockResolvedValue({
        id: APPROVAL_ID,
        tenant_id: TENANT_ID,
        run_id: RUN_ID,
        status: 'pending',
        approver_id: null,
        approver_role: 'tenant_admin',
        current_step_id: 'step-1',
      }),
      findMemberRole: vi.fn().mockResolvedValue('admin'),
      findRunById: vi.fn().mockResolvedValue({
        id: RUN_ID,
        tenant_id: TENANT_ID,
        workflow_id: 'wf-test',
        current_step_id: 'step-1',
        context: {},
      }),
      updateApproval: vi.fn().mockResolvedValue(undefined),
      updateRunStatus: vi.fn().mockResolvedValue(undefined),
    })

    const engine = createEngine(repos)
    const result = await engine.resolveApproval(APPROVAL_ID, OTHER_USER_ID, 'approved')

    expect(result).toEqual({ ok: true })
    expect(repos.findMemberRole).toHaveBeenCalledWith(TENANT_ID, OTHER_USER_ID)
  })

  it('rejects tenant_admin fallback for non-admin members', async () => {
    const repos = createMockWorkflowRepo({
      findApprovalById: vi.fn().mockResolvedValue({
        id: APPROVAL_ID,
        tenant_id: TENANT_ID,
        run_id: RUN_ID,
        status: 'pending',
        approver_id: null,
        approver_role: 'tenant_admin',
        current_step_id: 'step-1',
      }),
      findMemberRole: vi.fn().mockResolvedValue('freelancer'),
    })

    const engine = createEngine(repos)
    const result = await engine.resolveApproval(APPROVAL_ID, OTHER_USER_ID, 'approved')

    expect(result).toEqual({ ok: false, error: 'Not authorized to decide this approval' })
  })
})
