import { describe, expect, it, vi } from 'vitest'
import { runKnowledgeEmbeddingWorker } from '@/lib/knowledge/embedding-worker'
import type { Services } from '@/lib/services/factory'

describe('runKnowledgeEmbeddingWorker', () => {
  it('indexes claimed jobs and emits completion events', async () => {
    const services = {
      knowledge: {
        claimPendingEmbeddingJobs: vi.fn().mockResolvedValue([
          { entryId: 'e1', tenantId: 't1', category: 'sop', title: 'SOP' },
        ]),
        indexEntry: vi.fn().mockResolvedValue(2),
        markEmbeddingFailed: vi.fn(),
      },
      workflow: {
        emitEvent: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as Services

    const result = await runKnowledgeEmbeddingWorker(services, 10)

    expect(result.claimed).toBe(1)
    expect(result.indexed).toBe(1)
    expect(result.failed).toBe(0)
    expect(services.knowledge.indexEntry).toHaveBeenCalledWith('t1', 'e1')
    expect(services.workflow.emitEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'knowledge.embedding_completed' })
    )
  })

  it('marks failed entries on error', async () => {
    const services = {
      knowledge: {
        claimPendingEmbeddingJobs: vi.fn().mockResolvedValue([
          { entryId: 'e2', tenantId: 't1', category: 'sop', title: 'Fail' },
        ]),
        indexEntry: vi.fn().mockRejectedValue(new Error('API down')),
        markEmbeddingFailed: vi.fn().mockResolvedValue(undefined),
      },
      workflow: { emitEvent: vi.fn() },
    } as unknown as Services

    const result = await runKnowledgeEmbeddingWorker(services)

    expect(result.failed).toBe(1)
    expect(services.knowledge.markEmbeddingFailed).toHaveBeenCalledWith('e2', 't1')
  })
})
