import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['whatsapp:read'], rateLimit: 'default' },
  async ({ ctx }) => {
    const services = await createServices()
    const approvals = await services.whatsappPlatform.listPendingApprovals(
      ctx.userId!,
      ctx.tenant!.id
    )
    return { payload: approvals }
  }
)
