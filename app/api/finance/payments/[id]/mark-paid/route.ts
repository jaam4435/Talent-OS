import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { markPaidSchema } from '@/modules/finance/validation'

export const POST = withApiHandler(
  {
    auth: 'tenant',
    permissions: ['payments:pay'],
    rateLimit: 'default',
    validate: { body: markPaidSchema },
  },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const input = body as { payment_reference: string }
    const result = await services.financeModule.markPaymentPaid(
      ctx.tenant!.id,
      params!.id,
      ctx.userId!,
      input.payment_reference
    )
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return { payload: result.payment }
  }
)
