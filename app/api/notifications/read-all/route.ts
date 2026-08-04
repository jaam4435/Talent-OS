import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'

export const POST = withApiHandler(
  { auth: 'tenant', rateLimit: 'default' },
  async ({ ctx }) => {
    const services = await createServices()
    const result = await services.notificationModule.markAllRead(ctx.tenant!.id, ctx.userId!)
    return { payload: { updated: result.updated } }
  }
)
