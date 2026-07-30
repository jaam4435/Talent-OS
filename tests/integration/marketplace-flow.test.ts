import { describe, expect, it, vi } from 'vitest'
import { evaluateConditions } from '@/lib/workflows/conditions'
import { findWorkflowsForEvent } from '@/lib/workflows/registry'
import type { WorkflowTriggerContext } from '@/lib/workflows/types'
import { KnowledgeService } from '@/lib/services/knowledge.service'
import { createMockRepositories } from '@/tests/helpers/mock-repositories'
import { TEST_TENANT_ID, TEST_USER_ID } from '@/tests/helpers/mock-supabase'

/**
 * Integration tests — exercise multiple layers together with mocked I/O.
 */
describe('workflow + conditions integration', () => {
  it('milestone submitted workflow passes budget condition when met', () => {
    const [wf] = findWorkflowsForEvent('milestone.submitted')
    expect(wf).toBeDefined()

    const context: WorkflowTriggerContext = {
      tenantId: TEST_TENANT_ID,
      eventId: 'evt-ms-1',
      eventType: 'milestone.submitted',
      aggregateType: 'milestone',
      aggregateId: 'ms-1',
      actorId: TEST_USER_ID,
      correlationId: 'corr-1',
      idempotencyKey: 'idem-1',
      payload: { amount: 2500, project_id: 'proj-1' },
    }

    const conditions = [
      { field: 'payload.amount', operator: 'gt' as const, value: 0 },
      { field: 'eventType', operator: 'eq' as const, value: 'milestone.submitted' },
    ]

    expect(evaluateConditions(conditions, context)).toBe(true)
  })

  it('opportunity broadcast workflow triggers for matching event', () => {
    const workflows = findWorkflowsForEvent('opportunity.broadcast')
    expect(workflows.some((w) => w.id === 'wf-opportunity-broadcast')).toBe(true)
    const step = workflows[0].steps[0]
    expect(step.type).toBe('action')
    if (step.type === 'action') expect(step.action).toBe('dispatch_n8n')
  })
})

describe('knowledge service integration', () => {
  it('full create flow: validate → persist → chunk → pending status', async () => {
    const create = vi.fn().mockResolvedValue('new-entry-id')
    const createChunks = vi.fn().mockResolvedValue(['c1', 'c2'])
    const updateStatus = vi.fn().mockResolvedValue(undefined)

    const repos = createMockRepositories({
      knowledge: {
        create,
        updateEmbeddingStatus: updateStatus,
      } as never,
      knowledgeEmbedding: {
        createChunks,
      } as never,
    })

    const service = new KnowledgeService(repos)
    const longContent = 'A'.repeat(2000)

    const result = await service.createEntry(TEST_TENANT_ID, TEST_USER_ID, {
      category: 'project_history',
      title: 'Project log',
      content: longContent,
    })

    expect(result.ok).toBe(true)
    expect(create).toHaveBeenCalledOnce()
    expect(createChunks).toHaveBeenCalledOnce()
    expect(createChunks.mock.calls[0][2].length).toBeGreaterThan(1)
    expect(updateStatus).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), 'skipped')
  })

  it('update with content change refreshes embeddings', async () => {
    const deleteByEntry = vi.fn().mockResolvedValue(undefined)
    const createChunks = vi.fn().mockResolvedValue(['c1'])
    const update = vi.fn().mockResolvedValue(undefined)
    const updateStatus = vi.fn().mockResolvedValue(undefined)

    const repos = createMockRepositories({
      knowledge: {
        update,
        updateEmbeddingStatus: updateStatus,
      } as never,
      knowledgeEmbedding: {
        deleteByEntry,
        createChunks,
      } as never,
    })

    const service = new KnowledgeService(repos)
    const result = await service.updateEntry('entry-1', TEST_TENANT_ID, TEST_USER_ID, {
      content: 'Updated content',
    })

    expect(result.ok).toBe(true)
    expect(deleteByEntry).toHaveBeenCalledWith('entry-1', TEST_TENANT_ID)
    expect(createChunks).toHaveBeenCalled()
    expect(updateStatus).toHaveBeenCalledWith('entry-1', TEST_TENANT_ID, 'pending')
  })
})

describe('MCP gateway integration', () => {
  it('rejects unknown tool', async () => {
    const { getMcpGateway, createMcpExecutionContext } = await import('@/lib/mcp/gateway')

    const gateway = getMcpGateway()
    const context = createMcpExecutionContext({
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      role: 'admin',
      permissions: [],
    })

    const result = await gateway.invoke({
      serverId: 'talent',
      toolName: 'nonexistent_tool',
      input: {},
      context,
    })

    expect(result.isError).toBe(true)
  })
})
