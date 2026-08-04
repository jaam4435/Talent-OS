import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { retryCompensationsSchema } from '@/modules/workflow-engine/validation'

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['workflow:manage'], rateLimit: 'default', validate: { body: retryCompensationsSchema } },
  async ({ ctx, body }) => {
    const services = await createServices()
    const ids = (body as { compensation_ids: string[] }).compensation_ids
    await services.workflowEngineModule.retryCompensations(ctx.tenant!.id, ctx.userId!, ids)
    return { payload: { retried: ids.length } }
  }
)
