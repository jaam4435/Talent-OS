import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { retryEventsSchema } from '@/modules/workflow-engine/validation'

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['workflow:manage'], rateLimit: 'default', validate: { body: retryEventsSchema } },
  async ({ ctx, body }) => {
    const services = await createServices()
    const eventIds = (body as { event_ids: string[] }).event_ids
    await services.workflowEngineModule.retryEvents(ctx.tenant!.id, ctx.userId!, eventIds)
    return { payload: { retried: eventIds.length } }
  }
)
