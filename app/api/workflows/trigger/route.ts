import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { triggerWorkflowSchema } from '@/modules/workflow-engine/validation'

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['workflow:manage'], rateLimit: 'default', validate: { body: triggerWorkflowSchema } },
  async ({ ctx, body }) => {
    const services = await createServices()
    const input = body as {
      workflow_id: string
      aggregate_type: string
      aggregate_id: string
      payload?: Record<string, unknown>
      idempotency_key?: string
    }

    const result = await services.workflowEngineModule.triggerManual(ctx.tenant!.id, ctx.userId!, {
      workflowId: input.workflow_id,
      aggregateType: input.aggregate_type,
      aggregateId: input.aggregate_id,
      payload: input.payload,
      idempotencyKey: input.idempotency_key,
    })

    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return { payload: result }
  }
)
