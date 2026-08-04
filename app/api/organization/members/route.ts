import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { listQuerySchema } from '@/modules/organization/validation'

export const GET = withApiHandler(
  {
    auth: 'admin',
    permissions: ['members:manage'],
    rateLimit: 'default',
    validate: { query: listQuerySchema },
  },
  async ({ ctx, searchParams }) => {
    const services = await createServices()
    const page = Number(searchParams.get('page') ?? 1)
    const limit = Number(searchParams.get('limit') ?? 20)
    const q = searchParams.get('q') ?? undefined
    const status = searchParams.get('status') ?? undefined
    const role = searchParams.get('role') ?? undefined
    const result = await services.organization.listMembers(ctx.tenant!.id, {
      page,
      limit,
      q,
      status,
      role,
    })
    return {
      payload: result.data,
      meta: { page: result.page, limit: result.limit, total: result.total, hasMore: result.hasMore },
    }
  }
)
