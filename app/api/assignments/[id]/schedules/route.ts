import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { createScheduleSchema } from '@/modules/assignment/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['assignment:read'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const schedules = await services.assignmentModule.listSchedules(ctx.tenant!.id, params!.id)
    return { payload: schedules }
  }
)

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['assignment:manage'], rateLimit: 'default', validate: { body: createScheduleSchema } },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const result = await services.assignmentModule.addSchedule(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      body as Record<string, unknown>
    )
    if (!result.ok) throw new AppError('NOT_FOUND', result.error, 404)
    return { payload: result.schedule }
  }
)
