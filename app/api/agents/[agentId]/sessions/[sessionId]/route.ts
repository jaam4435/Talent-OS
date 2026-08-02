import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['agent:run'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const state = await services.agent.getConversationState(params!.sessionId, ctx.tenant!.id)
    if (!state) throw new AppError('NOT_FOUND', 'Session not found', 404)
    return { payload: state }
  }
)
