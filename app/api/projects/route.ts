import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { createProjectSchema, listQuerySchema } from '@/modules/project/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['project:read'], rateLimit: 'default', validate: { query: listQuerySchema } },
  async ({ ctx, searchParams }) => {
    const services = await createServices()
    const result = await services.projectModule.listProjects(ctx.tenant!.id, {
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 20),
      q: searchParams.get('q') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      priority: searchParams.get('priority') ?? undefined,
      healthStatus: searchParams.get('health_status') ?? undefined,
      freelancerId: searchParams.get('freelancer_id') ?? undefined,
      companyId: searchParams.get('company_id') ?? undefined,
    })
    return {
      payload: result.data,
      meta: { page: result.page, limit: result.limit, total: result.total, hasMore: result.hasMore },
    }
  }
)

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['project:manage'], rateLimit: 'default', validate: { body: createProjectSchema } },
  async ({ ctx, body }) => {
    const services = await createServices()
    const result = await services.projectModule.createProject(
      ctx.tenant!.id,
      ctx.userId!,
      body as Record<string, unknown>,
      ctx.tenant!.currency
    )
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return { payload: result.project }
  }
)
