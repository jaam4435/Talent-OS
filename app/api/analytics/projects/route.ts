import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { dashboardQuerySchema } from '@/modules/analytics/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['analytics:read'], rateLimit: 'default', validate: { query: dashboardQuerySchema } },
  async ({ ctx, searchParams }) => {
    const services = await createServices()
    const payload = await services.analyticsModule.getProjects(ctx.tenant!.id, {
      period: searchParams.get('period') ?? undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
      refresh: searchParams.get('refresh') === 'true',
    })
    return { payload }
  }
)
