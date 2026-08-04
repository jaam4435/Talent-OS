import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { jobQuerySchema } from '@/modules/workflow-engine/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['workflow:read'], rateLimit: 'default', validate: { query: jobQuerySchema } },
  async ({ ctx, searchParams }) => {
    const services = await createServices()
    const result = await services.workflowEngineModule.listJobs(ctx.tenant!.id, {
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 20),
      runId: searchParams.get('run_id') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      queueName: searchParams.get('queue_name') ?? undefined,
    })
    return {
      payload: result.data,
      meta: { page: result.page, limit: result.limit, total: result.total, hasMore: result.hasMore },
    }
  }
)
