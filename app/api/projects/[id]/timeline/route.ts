import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'

export const GET = withApiHandler(
  { auth: 'tenant', permissions: ['project:read'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const timeline = await services.projectModule.getTimeline(ctx.tenant!.id, params!.id)
    return { payload: timeline }
  }
)
