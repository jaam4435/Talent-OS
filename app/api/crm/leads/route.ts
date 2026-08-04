import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { createLeadSchema, listQuerySchema } from '@/modules/crm/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['crm:read'], rateLimit: 'default', validate: { query: listQuerySchema } },
  async ({ ctx, searchParams }) => {
    const services = await createServices()
    const result = await services.crmDemand.listLeads(ctx.tenant!.id, {
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 20),
      q: searchParams.get('q') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      company_id: searchParams.get('company_id') ?? undefined,
    })
    return { payload: result.data, meta: { page: result.page, limit: result.limit, total: result.total, hasMore: result.hasMore } }
  }
)

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['crm:leads:manage'], rateLimit: 'default', validate: { body: createLeadSchema } },
  async ({ ctx, body }) => {
    const services = await createServices()
    const input = body as Record<string, unknown>
    return services.crmDemand.createLead(ctx.tenant!.id, ctx.userId!, {
      tenant_id: ctx.tenant!.id,
      title: input.title as string,
      source: (input.source as string | null) ?? null,
      status: input.status as never,
      company_id: (input.company_id as string | null) ?? null,
      contact_id: (input.contact_id as string | null) ?? null,
      owner_id: (input.owner_id as string | null) ?? ctx.userId,
      value_estimate: (input.value_estimate as number | null) ?? null,
      currency: (input.currency as string) ?? 'USD',
      description: (input.description as string | null) ?? null,
    })
  }
)
