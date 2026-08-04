import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['talent:read'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const profile = await services.talentModule.getAiProfile(ctx.tenant!.id, params!.id)
    if (!profile) throw new AppError('NOT_FOUND', 'Talent not found', 404)
    return { payload: profile }
  }
)
