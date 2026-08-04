import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'

export const GET = withApiHandler(
  { auth: 'tenant', permissions: ['payments:read'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const payment = await services.financeModule.getPayment(
      ctx.tenant!.id,
      ctx.tenant!.role,
      ctx.userId!,
      params!.id
    )
    if (!payment) throw new AppError('NOT_FOUND', 'Payment not found', 404)
    return { payload: payment }
  }
)
