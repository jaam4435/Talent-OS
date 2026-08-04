import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { createDealSchema, listQuerySchema } from '@/modules/crm/validation'
import { AppError } from '@/modules/core/api/response'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['crm:read'], rateLimit: 'default', validate: { query: listQuerySchema } },
  async ({ ctx, searchParams }) => {
    const services = await createServices()
    const result = await services.crmDemand.listDeals(ctx.tenant!.id, {
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 20),
      q: searchParams.get('q') ?? undefined,
      stage_id: searchParams.get('stage_id') ?? undefined,
      company_id: searchParams.get('company_id') ?? undefined,
    })
    return { payload: result.data, meta: { page: result.page, limit: result.limit, total: result.total, hasMore: result.hasMore } }
  }
)

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['crm:deals:manage'], rateLimit: 'default', validate: { body: createDealSchema } },
  async ({ ctx, body }) => {
    const services = await createServices()
    const result = await services.crmDemand.createDeal(ctx.tenant!.id, ctx.userId!, body as Record<string, unknown>)
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return result.deal
  }
)
