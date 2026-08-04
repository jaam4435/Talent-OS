import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { createContractSchema, listQuerySchema } from '@/modules/crm/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['crm:read'], rateLimit: 'default', validate: { query: listQuerySchema } },
  async ({ ctx, searchParams }) => {
    const services = await createServices()
    const result = await services.crmDemand.listContracts(ctx.tenant!.id, {
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 20),
      status: searchParams.get('status') ?? undefined,
      company_id: searchParams.get('company_id') ?? undefined,
    })
    return { payload: result.data, meta: { page: result.page, limit: result.limit, total: result.total, hasMore: result.hasMore } }
  }
)

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['crm:deals:manage'], rateLimit: 'default', validate: { body: createContractSchema } },
  async ({ ctx, body }) => {
    const services = await createServices()
    return services.crmDemand.createContract(ctx.tenant!.id, ctx.userId!, body as Record<string, unknown>)
  }
)
