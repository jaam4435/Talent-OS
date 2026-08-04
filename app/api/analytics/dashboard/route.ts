import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { dashboardQuerySchema } from '@/modules/analytics/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['analytics:read'], rateLimit: 'default', validate: { query: dashboardQuerySchema } },
  async ({ ctx, searchParams }) => {
    const services = await createServices()
    const refresh = searchParams.get('refresh') === 'true'

    const [legacy, summary] = await Promise.all([
      services.analyticsModule.getLegacyDashboard(ctx.tenant!.id),
      services.analyticsModule.getSummary(ctx.tenant!.id, refresh),
    ])

    return { payload: { legacy, summary } }
  }
)
