import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { commandSchema } from '@/modules/whatsapp-platform/validation'
import { AppError } from '@/modules/core/api/response'

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['whatsapp:manage'], rateLimit: 'default', validate: { body: commandSchema } },
  async ({ ctx, body }) => {
    const services = await createServices()
    const result = await services.whatsappPlatform.executeCommand(
      ctx.tenant!.id,
      ctx.userId!,
      ctx.tenant!.currency,
      {
        intent: body.intent,
        freelancerId: body.freelancer_id,
        entityType: body.entity_type,
        entityId: body.entity_id,
        payload: body.payload,
        note: body.note,
      }
    )

    if (!result.ok) {
      throw new AppError('COMMAND_FAILED', result.error, 422)
    }

    return { payload: result.data }
  }
)
