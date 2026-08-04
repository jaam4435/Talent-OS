import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { auditQuerySchema } from '@/modules/project/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['project:audit:read'], rateLimit: 'default', validate: { query: auditQuerySchema } },
  async ({ ctx, searchParams }) => {
    const services = await createServices()
    const result = await services.projectModule.listAuditLogs(ctx.tenant!.id, {
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 20),
      action: searchParams.get('action') ?? undefined,
      entityType: searchParams.get('entity_type') ?? undefined,
    })
    return {
      payload: result.data,
      meta: { page: result.page, limit: result.limit, total: result.total, hasMore: result.hasMore },
    }
  }
)
