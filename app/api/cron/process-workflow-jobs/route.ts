import { withApiHandler } from '@/modules/core/api/handler'
import { createAdminServices } from '@/lib/services/factory'

export const GET = withApiHandler(
  { auth: 'cron', rateLimit: 'cron', legacyEnvelope: true },
  async ({ searchParams }) => {
    const queue = searchParams.get('queue') ?? undefined
    const limit = Number(searchParams.get('limit') ?? 50)

    const services = await createAdminServices()
    return services.workflowEngine.processJobQueue(limit, queue ?? undefined)
  }
)
