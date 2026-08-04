import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { createTaskSchema, updateTaskSchema } from '@/modules/project/validation'

export const GET = withApiHandler(
  { auth: 'tenant', permissions: ['project:read'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const tasks = await services.projectModule.listTasks(ctx.tenant!.id, params!.id)
    return { payload: tasks }
  }
)

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['project:manage'], rateLimit: 'default', validate: { body: createTaskSchema } },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const result = await services.projectModule.createTask(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      body as Record<string, unknown>
    )
    if (!result.ok) throw new AppError('NOT_FOUND', result.error, 404)
    return { payload: result.task }
  }
)

export const PATCH = withApiHandler(
  { auth: 'manager', permissions: ['project:manage'], rateLimit: 'default', validate: { body: updateTaskSchema } },
  async ({ ctx, params, body, searchParams }) => {
    const taskId = searchParams.get('task_id')
    if (!taskId) throw new AppError('VALIDATION_ERROR', 'task_id query param required', 400)

    const services = await createServices()
    const result = await services.projectModule.updateTask(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      taskId,
      body as Record<string, unknown>
    )
    if (!result.ok) throw new AppError('NOT_FOUND', result.error, 404)
    return { payload: result.task }
  }
)
