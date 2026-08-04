import { z } from 'zod'
import { withApiHandler } from '@/modules/core/api/handler'
import { requestTalentMatch } from '@/lib/integrations/ai/matching'

const matchBodySchema = z.object({
  opportunity_id: z.string().uuid(),
})

export const POST = withApiHandler(
  {
    auth: 'tenant',
    permissions: ['ai:match'],
    rateLimit: 'ai',
    idempotency: true,
    validate: { body: matchBodySchema },
  },
  async ({ body, ctx }) => {
    const parsed = body as z.infer<typeof matchBodySchema>
    return requestTalentMatch({
      tenantId: ctx.tenant!.id,
      opportunityId: parsed.opportunity_id,
      actorId: ctx.userId!,
    })
  }
)
