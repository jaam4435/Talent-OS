import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { AppError } from '@/modules/core/api/response'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['whatsapp:read'], rateLimit: 'default' },
  async ({ ctx, params, searchParams }) => {
    const services = await createServices()
    const freelancerId = params.freelancerId as string

    const conversation = await services.whatsappPlatform.getConversation(ctx.tenant!.id, freelancerId)
    if (!conversation) {
      throw new AppError('NOT_FOUND', 'Conversation not found', 404)
    }

    const memory = await services.whatsappPlatform.listMemory(ctx.tenant!.id, freelancerId, {
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 20),
    })

    return {
      payload: { conversation, memory: memory.data },
      meta: {
        page: memory.page,
        limit: memory.limit,
        total: memory.total,
        hasMore: memory.hasMore,
      },
    }
  }
)
