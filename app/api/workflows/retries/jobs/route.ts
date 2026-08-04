import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { retryJobsSchema } from '@/modules/workflow-engine/validation'

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['workflow:manage'], rateLimit: 'default', validate: { body: retryJobsSchema } },
  async ({ ctx, body }) => {
    const services = await createServices()
    const jobIds = (body as { job_ids: string[] }).job_ids
    await services.workflowEngineModule.retryJobs(ctx.tenant!.id, ctx.userId!, jobIds)
    return { payload: { retried: jobIds.length } }
  }
)
