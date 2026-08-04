import { withApiHandler } from '@/modules/core/api/handler'
import { createAdminServices } from '@/lib/services/factory'

export const GET = withApiHandler(
  { auth: 'cron', rateLimit: 'cron', legacyEnvelope: true },
  async () => {
    const startedAt = Date.now()
    const services = await createAdminServices()
    const result = await services.analyticsModule.refreshAllSnapshots(15)

    return {
      ...result,
      durationMs: Date.now() - startedAt,
    }
  }
)
