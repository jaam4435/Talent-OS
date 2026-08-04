import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'

export const PATCH = withApiHandler(
  { auth: 'manager', permissions: ['assignment:manage'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const result = await services.assignmentModule.resolveConflict(ctx.tenant!.id, ctx.userId!, params!.id)
    if (!result.ok) throw new AppError('NOT_FOUND', result.error, 404)
    return { payload: result.conflict }
  }
)
