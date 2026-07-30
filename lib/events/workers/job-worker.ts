import type { Services } from '@/lib/services/factory'
import { runEventCompletionWorker } from '@/lib/events/workers/dispatch-worker'

/** Background worker: process workflow job queue with completion finalization. */
export async function runJobProcessorWorker(
  services: Services,
  limit = 50,
  queue?: string
) {
  const result = await services.workflowEngine.processJobQueue(limit, queue)
  const finalized = await runEventCompletionWorker(services, limit)
  return { ...result, eventsFinalized: finalized }
}
