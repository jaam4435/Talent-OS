import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['project:read'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const health = await services.projectModule.getHealth(ctx.tenant!.id, params!.id)
    if (!health) throw new AppError('NOT_FOUND', 'Project not found', 404)
    return { payload: health }
  }
)
