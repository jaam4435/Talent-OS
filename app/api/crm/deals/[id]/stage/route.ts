import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { moveDealStageSchema } from '@/modules/crm/validation'
import { AppError } from '@/modules/core/api/response'

export const PATCH = withApiHandler(
  { auth: 'manager', permissions: ['crm:deals:manage'], rateLimit: 'default', validate: { body: moveDealStageSchema } },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const { stage_id } = body as { stage_id: string }
    const result = await services.crmDemand.moveDealStage(ctx.tenant!.id, ctx.userId!, params!.id, stage_id)
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return result.deal
  }
)
