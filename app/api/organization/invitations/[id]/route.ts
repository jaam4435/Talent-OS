import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { AppError } from '@/modules/core/api/response'

export const DELETE = withApiHandler(
  { auth: 'admin', permissions: ['members:invite'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const result = await services.organization.revokeInvite(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id
    )
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return { revoked: true }
  }
)
