import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { listNotificationsQuerySchema } from '@/modules/notifications/validation'

export const GET = withApiHandler(
  { auth: 'tenant', rateLimit: 'default', validate: { query: listNotificationsQuerySchema } },
  async ({ ctx, searchParams }) => {
    const services = await createServices()
    const unreadOnly = searchParams.get('unread_only') === 'true'
    const result = await services.notificationModule.listNotifications(
      ctx.tenant!.id,
      ctx.userId!,
      {
        page: Number(searchParams.get('page') ?? 1),
        limit: Number(searchParams.get('limit') ?? 20),
        unreadOnly,
      }
    )

    return {
      payload: result.data,
      meta: services.notificationModule.buildListMeta(result, result.unreadCount),
    }
  }
)
