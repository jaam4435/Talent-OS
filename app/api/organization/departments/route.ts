import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { createDepartmentSchema, listQuerySchema } from '@/modules/organization/validation'
import { AppError } from '@/modules/core/api/response'

export const GET = withApiHandler(
  {
    auth: 'tenant',
    permissions: ['org:departments:read'],
    rateLimit: 'default',
    validate: { query: listQuerySchema },
  },
  async ({ ctx, searchParams }) => {
    const services = await createServices()
    const page = Number(searchParams.get('page') ?? 1)
    const limit = Number(searchParams.get('limit') ?? 20)
    const q = searchParams.get('q') ?? undefined
    const result = await services.organization.listDepartments(ctx.tenant!.id, { page, limit, q })
    return { payload: result.data, meta: { page: result.page, limit: result.limit, total: result.total, hasMore: result.hasMore } }
  }
)

export const POST = withApiHandler(
  {
    auth: 'manager',
    permissions: ['org:departments:manage'],
    rateLimit: 'default',
    validate: { body: createDepartmentSchema },
  },
  async ({ ctx, body }) => {
    const services = await createServices()
    const result = await services.organization.createDepartment(
      ctx.tenant!.id,
      ctx.userId!,
      body as Parameters<typeof services.organization.createDepartment>[2]
    )
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return result.department
  }
)
