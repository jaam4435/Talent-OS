import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { transitionStatusSchema } from '@/modules/project/validation'
import type { ProjectStatus } from '@/modules/core/types/enums'

export const PATCH = withApiHandler(
  { auth: 'manager', permissions: ['project:manage'], rateLimit: 'default', validate: { body: transitionStatusSchema } },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const input = body as { status: ProjectStatus; role?: 'manager' | 'freelancer' }
    const result = await services.projectModule.transitionStatus(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      input.status,
      input.role ?? 'manager',
      ctx.userId!
    )
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return { payload: result.project }
  }
)
