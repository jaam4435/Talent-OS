import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { skillMatchSchema } from '@/modules/talent/validation'

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['talent:read'], rateLimit: 'default', validate: { body: skillMatchSchema } },
  async ({ ctx, body }) => {
    const services = await createServices()
    const input = body as { skills: string[]; discipline?: string; limit?: number }
    const matches = await services.talentModule.matchSkills(
      ctx.tenant!.id,
      input.skills,
      input.discipline,
      input.limit
    )
    return { payload: matches }
  }
)
