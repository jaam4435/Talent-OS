import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { resolveApprovalSchema } from '@/modules/workflow-engine/validation'

export const PATCH = withApiHandler(
  { auth: 'manager', permissions: ['workflow:manage'], rateLimit: 'default', validate: { body: resolveApprovalSchema } },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const input = body as { decision: 'approved' | 'rejected'; note?: string | null }
    const result = await services.workflowEngineModule.resolveApproval(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      input.decision,
      input.note ?? undefined
    )
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return { payload: { ok: true } }
  }
)
