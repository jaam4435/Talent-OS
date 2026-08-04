import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { createTeamSchema, listQuerySchema } from '@/modules/organization/validation'
import { AppError } from '@/modules/core/api/response'

export const GET = withApiHandler(
  {
    auth: 'tenant',
    permissions: ['org:teams:read'],
    rateLimit: 'default',
    validate: { query: listQuerySchema },
  },
  async ({ ctx, searchParams }) => {
    const services = await createServices()
    const page = Number(searchParams.get('page') ?? 1)
    const limit = Number(searchParams.get('limit') ?? 20)
    const q = searchParams.get('q') ?? undefined
    const departmentId = searchParams.get('department_id') ?? undefined
    const result = await services.organization.listTeams(ctx.tenant!.id, {
      page,
      limit,
      q,
      departmentId,
    })
    return {
      payload: result.data,
      meta: { page: result.page, limit: result.limit, total: result.total, hasMore: result.hasMore },
    }
  }
)

export const POST = withApiHandler(
  {
    auth: 'manager',
    permissions: ['org:teams:manage'],
    rateLimit: 'default',
    validate: { body: createTeamSchema },
  },
  async ({ ctx, body }) => {
    const services = await createServices()
    const result = await services.organization.createTeam(
      ctx.tenant!.id,
      ctx.userId!,
      body as Parameters<typeof services.organization.createTeam>[2]
    )
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return result.team
  }
)
