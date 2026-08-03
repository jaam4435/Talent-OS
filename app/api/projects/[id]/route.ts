import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { updateProjectSchema } from '@/modules/project/validation'

export const GET = withApiHandler(
  { auth: 'tenant', permissions: ['project:read'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const project = await services.projectModule.getProject(ctx.tenant!.id, params!.id)
    if (!project) throw new AppError('NOT_FOUND', 'Project not found', 404)
    return { payload: project }
  }
)

export const PATCH = withApiHandler(
  { auth: 'manager', permissions: ['project:manage'], rateLimit: 'default', validate: { body: updateProjectSchema } },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const result = await services.projectModule.updateProject(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      body as Record<string, unknown>
    )
    if (!result.ok) throw new AppError('NOT_FOUND', result.error, 404)
    return { payload: result.project }
  }
)

export const DELETE = withApiHandler(
  { auth: 'manager', permissions: ['project:manage'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const result = await services.projectModule.deleteProject(ctx.tenant!.id, ctx.userId!, params!.id)
    if (!result.ok) throw new AppError('NOT_FOUND', result.error, 404)
    return { payload: { deleted: true } }
  }
)
