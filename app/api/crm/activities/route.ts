import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { createActivitySchema, listQuerySchema } from '@/modules/crm/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['crm:read'], rateLimit: 'default' },
  async ({ ctx, searchParams }) => {
    const entityType = searchParams.get('entity_type')
    const entityId = searchParams.get('entity_id')
    if (!entityType || !entityId) {
      return { payload: [], meta: { page: 1, limit: 20, total: 0, hasMore: false } }
    }
    const services = await createServices()
    const result = await services.crmDemand.listActivities(ctx.tenant!.id, entityType, entityId, {
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 20),
    })
    return { payload: result.data, meta: { page: result.page, limit: result.limit, total: result.total, hasMore: result.hasMore } }
  }
)

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['crm:leads:manage'], rateLimit: 'default', validate: { body: createActivitySchema } },
  async ({ ctx, body }) => {
    const services = await createServices()
    const input = body as {
      entity_type: string
      entity_id: string
      activity_type?: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'other'
      subject: string
      description?: string | null
      occurred_at?: string
    }
    return services.crmDemand.logActivity(ctx.tenant!.id, ctx.userId!, {
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      activity_type: input.activity_type ?? 'other',
      subject: input.subject,
      description: input.description ?? null,
      occurred_at: input.occurred_at,
    })
  }
)
