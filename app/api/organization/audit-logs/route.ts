import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { auditQuerySchema } from '@/modules/organization/validation'

export const GET = withApiHandler(
  {
    auth: 'admin',
    permissions: ['org:audit:read'],
    rateLimit: 'default',
    validate: { query: auditQuerySchema },
  },
  async ({ ctx, searchParams }) => {
    const services = await createServices()
    const page = Number(searchParams.get('page') ?? 1)
    const limit = Number(searchParams.get('limit') ?? 20)
    const action = searchParams.get('action') ?? undefined
    const entityType = searchParams.get('entity_type') ?? undefined
    const result = await services.organization.listAuditLogs(ctx.tenant!.id, {
      page,
      limit,
      action,
      entityType,
    })
    return {
      payload: result.data,
      meta: { page: result.page, limit: result.limit, total: result.total, hasMore: result.hasMore },
    }
  }
)
