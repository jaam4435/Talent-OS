import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'

export const GET = withApiHandler(
  { auth: 'manager', rateLimit: 'default' },
  async ({ ctx, params }) => {
    const correlationId = params?.correlationId
    if (!correlationId) {
      throw new AppError('VALIDATION_ERROR', 'correlationId is required', 400)
    }

    const { createServices } = await import('@/lib/services/factory')
    const services = await createServices()
    return services.observability.getTrace(correlationId)
  }
)
