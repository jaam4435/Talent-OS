import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { exportSchema, exportListQuerySchema } from '@/modules/analytics/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['analytics:export'], rateLimit: 'default', validate: { query: exportListQuerySchema } },
  async ({ ctx, searchParams }) => {
    const services = await createServices()
    const result = await services.analyticsModule.listExports(ctx.tenant!.id, {
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 20),
    })
    return {
      payload: result.data,
      meta: { page: result.page, limit: result.limit, total: result.total, hasMore: result.hasMore },
    }
  }
)

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['analytics:export'], rateLimit: 'default', validate: { body: exportSchema } },
  async ({ ctx, body }) => {
    const services = await createServices()
    const record = await services.analyticsModule.createExport(ctx.tenant!.id, ctx.userId!, {
      dashboard: body.dashboard,
      format: body.format,
      period: body.period,
      from: body.from,
      to: body.to,
    })
    return { payload: record }
  }
)
