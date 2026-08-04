import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { resolveApprovalSchema } from '@/modules/whatsapp-platform/validation'
import { AppError } from '@/modules/core/api/response'

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['whatsapp:manage'], rateLimit: 'default', validate: { body: resolveApprovalSchema } },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const approvalId = params.id as string

    const result = await services.whatsappPlatform.resolveApproval(
      ctx.tenant!.id,
      ctx.userId!,
      approvalId,
      body.decision,
      body.note
    )

    if (!result.ok) {
      throw new AppError('APPROVAL_FAILED', result.error ?? 'Approval resolution failed', 422)
    }

    return { payload: { approval_id: approvalId, decision: body.decision } }
  }
)
