import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { createCapacitySchema } from '@/modules/assignment/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['assignment:read'], rateLimit: 'default' },
  async ({ ctx, searchParams }) => {
    const freelancerId = searchParams.get('freelancer_id')
    if (!freelancerId) throw new AppError('VALIDATION_ERROR', 'freelancer_id required', 400)

    const services = await createServices()
    const capacity = await services.assignmentModule.getCapacity(ctx.tenant!.id, freelancerId)
    return { payload: capacity }
  }
)

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['assignment:manage'], rateLimit: 'default', validate: { body: createCapacitySchema } },
  async ({ ctx, body }) => {
    const services = await createServices()
    const capacity = await services.assignmentModule.setCapacity(
      ctx.tenant!.id,
      ctx.userId!,
      body as Record<string, unknown>
    )
    return { payload: capacity }
  }
)
