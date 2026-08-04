import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['workflow:read'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const run = await services.workflowEngineModule.getRun(ctx.tenant!.id, params!.id)
    if (!run) throw new AppError('NOT_FOUND', 'Workflow run not found', 404)
    return { payload: run }
  }
)
