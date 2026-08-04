import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { listQuerySchema } from '@/modules/whatsapp-platform/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['whatsapp:read'], rateLimit: 'default', validate: { query: listQuerySchema } },
  async ({ ctx, searchParams }) => {
    const services = await createServices()
    const result = await services.whatsappPlatform.listConversations(ctx.tenant!.id, {
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 20),
    })
    return {
      payload: result.data,
      meta: { page: result.page, limit: result.limit, total: result.total, hasMore: result.hasMore },
    }
  }
)
