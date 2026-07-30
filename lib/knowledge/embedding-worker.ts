import { KnowledgeEvents } from '@/modules/knowledge/events'
import { IdempotencyKeys } from '@/lib/events/idempotency'
import type { Services } from '@/lib/services/factory'

export interface EmbeddingWorkerResult {
  claimed: number
  indexed: number
  failed: number
  results: Array<{ entryId: string; ok: boolean; chunks?: number; error?: string }>
}

/** Background worker: claim pending entries and generate embedding vectors. */
export async function runKnowledgeEmbeddingWorker(
  services: Services,
  limit = 20
): Promise<EmbeddingWorkerResult> {
  const jobs = await services.knowledge.claimPendingEmbeddingJobs(limit)
  const results: EmbeddingWorkerResult['results'] = []

  for (const job of jobs) {
    try {
      const chunksIndexed = await services.knowledge.indexEntry(job.tenantId, job.entryId)

      await services.workflow.emitEvent({
        tenantId: job.tenantId,
        eventType: KnowledgeEvents.EMBEDDING_COMPLETED,
        aggregateType: 'knowledge_entry',
        aggregateId: job.entryId,
        idempotencyKey: IdempotencyKeys.knowledgeEmbedding(job.entryId),
        payload: {
          entry_id: job.entryId,
          category: job.category,
          chunks_indexed: chunksIndexed,
        },
      })

      results.push({ entryId: job.entryId, ok: true, chunks: chunksIndexed })
    } catch (error) {
      await services.knowledge.markEmbeddingFailed(job.entryId, job.tenantId)
      results.push({
        entryId: job.entryId,
        ok: false,
        error: error instanceof Error ? error.message : 'Embedding failed',
      })
    }
  }

  return {
    claimed: jobs.length,
    indexed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  }
}
