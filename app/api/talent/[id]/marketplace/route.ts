import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { marketplaceVisibilitySchema } from '@/modules/talent/validation'

export const PATCH = withApiHandler(
  {
    auth: 'manager',
    permissions: ['talent:manage'],
    rateLimit: 'default',
    validate: { body: marketplaceVisibilitySchema },
  },
  async ({ ctx, body, params }) => {
    const services = await createServices()
    const result = await services.talentModule.setMarketplaceVisibility(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      (body as { visible: boolean }).visible
    )

    if (!result.ok) throw new AppError('NOT_FOUND', result.error, 404)

    return { payload: result.talent }
  }
)
