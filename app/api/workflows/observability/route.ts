import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['workflow:read'], rateLimit: 'default' },
  async ({ ctx }) => {
    const services = await createServices()
    const summary = await services.workflowEngineModule.getObservabilitySummary(ctx.tenant!.id)
    const businessWorkflows = services.workflowEngineModule.listBuiltinDefinitions()
    return {
      payload: { summary, businessWorkflows },
      meta: { generatedAt: new Date().toISOString() },
    }
  }
)
