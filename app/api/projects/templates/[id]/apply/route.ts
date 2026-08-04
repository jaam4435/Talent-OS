import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { applyTemplateSchema } from '@/modules/project/validation'

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['project:manage'], rateLimit: 'default', validate: { body: applyTemplateSchema } },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const result = await services.projectModule.applyTemplate(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      body as Record<string, unknown>,
      ctx.tenant!.currency
    )
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return { payload: result.project }
  }
)
