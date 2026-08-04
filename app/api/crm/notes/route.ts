import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { createNoteSchema, listQuerySchema } from '@/modules/crm/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['crm:read'], rateLimit: 'default' },
  async ({ ctx, searchParams }) => {
    const entityType = searchParams.get('entity_type')
    const entityId = searchParams.get('entity_id')
    if (!entityType || !entityId) {
      return { payload: [], meta: { page: 1, limit: 20, total: 0, hasMore: false } }
    }
    const services = await createServices()
    const result = await services.crmDemand.listNotes(ctx.tenant!.id, entityType, entityId, {
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 20),
    })
    return { payload: result.data, meta: { page: result.page, limit: result.limit, total: result.total, hasMore: result.hasMore } }
  }
)

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['crm:leads:manage'], rateLimit: 'default', validate: { body: createNoteSchema } },
  async ({ ctx, body }) => {
    const services = await createServices()
    const input = body as { entity_type: string; entity_id: string; body: string }
    return services.crmDemand.createNote(ctx.tenant!.id, ctx.userId!, input)
  }
)
