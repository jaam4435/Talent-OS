import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { AppError } from '@/modules/core/api/response'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['crm:read'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const deal = await services.crmDemand.getDeal(ctx.tenant!.id, params!.id)
    if (!deal) throw new AppError('NOT_FOUND', 'Deal not found', 404)
    return deal
  }
)
