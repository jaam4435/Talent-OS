import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { approvePaymentSchema } from '@/modules/finance/validation'

export const POST = withApiHandler(
  {
    auth: 'tenant',
    permissions: ['payments:approve'],
    rateLimit: 'default',
    validate: { body: approvePaymentSchema },
  },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const input = body as { notes?: string }
    const result = await services.financeModule.approvePayment(
      ctx.tenant!.id,
      params!.id,
      ctx.userId!,
      input.notes
    )
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return { payload: result.payment }
  }
)
