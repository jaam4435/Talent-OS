import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['assignment:read'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const history = await services.assignmentModule.getHistory(ctx.tenant!.id, params!.id)
    return { payload: history }
  }
)
