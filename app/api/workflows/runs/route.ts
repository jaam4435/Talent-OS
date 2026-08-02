import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { runQuerySchema } from '@/modules/workflow-engine/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['workflow:read'], rateLimit: 'default', validate: { query: runQuerySchema } },
  async ({ ctx, searchParams }) => {
    const services = await createServices()
    const result = await services.workflowEngineModule.listRuns(ctx.tenant!.id, {
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 20),
      status: searchParams.get('status') ?? undefined,
      workflowId: searchParams.get('workflow_id') ?? undefined,
      triggerEventType: searchParams.get('trigger_event_type') ?? undefined,
    })
    return {
      payload: result.data,
      meta: { page: result.page, limit: result.limit, total: result.total, hasMore: result.hasMore },
    }
  }
)
