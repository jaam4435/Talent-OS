import { withApiHandler } from '@/modules/core/api/handler'
import { instrumentQueueProcessing } from '@/lib/observability/instrumentation'

export const GET = withApiHandler(
  { auth: 'cron', rateLimit: 'cron', legacyEnvelope: true },
  async () => {
    const startedAt = Date.now()
    const { createAdminServices } = await import('@/lib/services/factory')
    const services = await createAdminServices()
    const result = await services.observability.evaluateAlerts()
    instrumentQueueProcessing({
      queue: 'alerts',
      processed: result.fired,
      failed: 0,
      durationMs: Date.now() - startedAt,
    })
    return result
  }
)
