import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { createRequirementSchema } from '@/modules/assignment/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['assignment:read'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const requirements = await services.assignmentModule.listRequirements(ctx.tenant!.id, params!.id)
    return { payload: requirements }
  }
)

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['assignment:manage'], rateLimit: 'default', validate: { body: createRequirementSchema } },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const result = await services.assignmentModule.addRequirement(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      body as Record<string, unknown>
    )
    if (!result.ok) throw new AppError('NOT_FOUND', result.error, 404)
    return { payload: result.requirement }
  }
)
