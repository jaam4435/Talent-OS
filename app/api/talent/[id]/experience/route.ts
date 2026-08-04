import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { createExperienceSchema, updateExperienceSchema } from '@/modules/talent/validation'
import { AppError } from '@/modules/core/api/response'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['talent:read'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const data = await services.talentModule.listExperience(ctx.tenant!.id, params!.id)
    return { payload: data }
  }
)

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['talent:manage'], rateLimit: 'default', validate: { body: createExperienceSchema } },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const result = await services.talentModule.addExperience(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      body as Record<string, unknown>
    )
    if (!result.ok) throw new AppError('NOT_FOUND', result.error, 404)
    return { payload: result.experience }
  }
)

export const PATCH = withApiHandler(
  { auth: 'manager', permissions: ['talent:manage'], rateLimit: 'default', validate: { body: updateExperienceSchema } },
  async ({ ctx, params, body, searchParams }) => {
    const experienceId = searchParams.get('experience_id')
    if (!experienceId) throw new AppError('VALIDATION_ERROR', 'experience_id query param required', 400)

    const services = await createServices()
    const result = await services.talentModule.updateExperience(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      experienceId,
      body as Record<string, unknown>
    )
    if (!result.ok) throw new AppError('NOT_FOUND', result.error, 404)
    return { payload: result.experience }
  }
)

export const DELETE = withApiHandler(
  { auth: 'manager', permissions: ['talent:manage'], rateLimit: 'default' },
  async ({ ctx, params, searchParams }) => {
    const experienceId = searchParams.get('experience_id')
    if (!experienceId) throw new AppError('VALIDATION_ERROR', 'experience_id query param required', 400)

    const services = await createServices()
    const result = await services.talentModule.deleteExperience(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      experienceId
    )
    if (!result.ok) throw new AppError('NOT_FOUND', result.error, 404)
    return { payload: { deleted: true } }
  }
)
