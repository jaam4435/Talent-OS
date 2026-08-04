import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['crm:read'], rateLimit: 'default' },
  async ({ ctx }) => {
    const services = await createServices()
    return services.crmDemand.getPipelineBoard(ctx.tenant!.id)
  }
)
