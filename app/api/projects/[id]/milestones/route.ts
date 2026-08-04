import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { updateMilestoneSchema } from '@/modules/project/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['project:read'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const milestones = await services.projectModule.listMilestones(ctx.tenant!.id, params!.id)
    return { payload: milestones }
  }
)

export const PATCH = withApiHandler(
  { auth: 'manager', permissions: ['project:manage'], rateLimit: 'default', validate: { body: updateMilestoneSchema } },
  async ({ ctx, params, body, searchParams }) => {
    const milestoneId = searchParams.get('milestone_id')
    if (!milestoneId) throw new AppError('VALIDATION_ERROR', 'milestone_id query param required', 400)

    const services = await createServices()
    const result = await services.projectModule.updateMilestone(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      milestoneId,
      body as Record<string, unknown>
    )
    if (!result.ok) throw new AppError('NOT_FOUND', result.error, 404)
    return { payload: result.milestone }
  }
)
