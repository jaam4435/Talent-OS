import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { updateAllocationSchema } from '@/modules/assignment/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['assignment:read'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const allocation = await services.assignmentModule.getAllocation(ctx.tenant!.id, params!.id)
    if (!allocation) throw new AppError('NOT_FOUND', 'Assignment not found', 404)
    return { payload: allocation }
  }
)

export const PATCH = withApiHandler(
  { auth: 'manager', permissions: ['assignment:manage'], rateLimit: 'default', validate: { body: updateAllocationSchema } },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const result = await services.assignmentModule.updateAllocation(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      body as Record<string, unknown>
    )
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400, { conflicts: result.conflicts })
    return { payload: result.allocation, meta: { conflicts: result.conflicts } }
  }
)

export const DELETE = withApiHandler(
  { auth: 'manager', permissions: ['assignment:manage'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const result = await services.assignmentModule.cancelAllocation(ctx.tenant!.id, ctx.userId!, params!.id)
    if (!result.ok) throw new AppError('NOT_FOUND', result.error, 404)
    return { payload: { canceled: true } }
  }
)
