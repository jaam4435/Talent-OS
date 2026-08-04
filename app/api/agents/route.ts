import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['agent:run'], rateLimit: 'default' },
  async ({ ctx }) => {
    const services = await createServices()
    const agents = await services.agent.listAgents(ctx.tenant!.id)
    return { payload: agents }
  }
)
