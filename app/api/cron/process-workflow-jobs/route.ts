import { withApiHandler } from '@/modules/core/api/handler'
import { instrumentQueueProcessing } from '@/lib/observability/instrumentation'
import { createAdminServices } from '@/lib/services/factory'

export const GET = withApiHandler(
  { auth: 'cron', rateLimit: 'cron', legacyEnvelope: true },
  async ({ searchParams }) => {
    const startedAt = Date.now()
    const queue = searchParams.get('queue') ?? undefined
    const limit = Number(searchParams.get('limit') ?? 50)

    const services = await createAdminServices()
    const result = await services.workflowEngine.processJobQueue(limit, queue ?? undefined)
    const compensation = await services.workflowEngine.processCompensationQueue(limit)

    instrumentQueueProcessing({
      queue: queue ?? 'workflow_jobs',
      processed: result.processed ?? 0,
      failed: result.results?.filter((r: { ok: boolean }) => !r.ok).length ?? 0,
      durationMs: Date.now() - startedAt,
    })

    return { ...result, compensation }
  }
)
