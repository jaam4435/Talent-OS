import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['workflow:read'], rateLimit: 'default' },
  async ({ ctx }) => {
    const services = await createServices()
    const approvals = await services.workflowEngineModule.listPendingApprovals(
      ctx.userId!,
      ctx.tenant!.id
    )
    return { payload: approvals }
  }
)
