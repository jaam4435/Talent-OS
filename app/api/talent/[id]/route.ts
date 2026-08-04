import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { updateTalentSchema } from '@/modules/talent/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['talent:read'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const talent = await services.talentModule.getTalent(ctx.tenant!.id, params!.id)
    if (!talent) throw new AppError('NOT_FOUND', 'Talent not found', 404)
    return { payload: talent }
  }
)

export const PATCH = withApiHandler(
  { auth: 'manager', permissions: ['talent:manage'], rateLimit: 'default', validate: { body: updateTalentSchema } },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const result = await services.talentModule.updateTalent(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      body as Record<string, unknown>
    )
    if (!result.ok) throw new AppError('NOT_FOUND', result.error, 404)
    return { payload: result.talent }
  }
)

export const DELETE = withApiHandler(
  { auth: 'manager', permissions: ['talent:manage'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const result = await services.talentModule.deleteTalent(ctx.tenant!.id, ctx.userId!, params!.id)
    if (!result.ok) throw new AppError('NOT_FOUND', result.error, 404)
    return { payload: { deleted: true } }
  }
)
