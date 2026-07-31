import { z } from 'zod'
import { withApiHandler } from '@/modules/core/api/handler'
import { executeTalentMatch } from '@/lib/integrations/ai/matching'

const bodySchema = z.object({
  ai_request_id: z.string().uuid(),
  actor_id: z.string().uuid().nullable().optional(),
})

export const POST = withApiHandler(
  { auth: 'cron', rateLimit: 'cron', validate: { body: bodySchema } },
  async ({ body }) => {
    const parsed = body as z.infer<typeof bodySchema>
    return executeTalentMatch(parsed.ai_request_id, parsed.actor_id ?? null)
  }
)
