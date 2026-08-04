import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { createCompanySchema, listQuerySchema } from '@/modules/crm/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['crm:read'], rateLimit: 'default', validate: { query: listQuerySchema } },
  async ({ ctx, searchParams }) => {
    const services = await createServices()
    const result = await services.crmDemand.listCompanies(ctx.tenant!.id, {
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 20),
      q: searchParams.get('q') ?? undefined,
      status: searchParams.get('status') ?? undefined,
    })
    return { payload: result.data, meta: { page: result.page, limit: result.limit, total: result.total, hasMore: result.hasMore } }
  }
)

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['companies:create'], rateLimit: 'default', validate: { body: createCompanySchema } },
  async ({ ctx, body }) => {
    const services = await createServices()
    return services.crmDemand.createCompany(ctx.tenant!.id, ctx.userId!, body as never)
  }
)
