import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { suggestSchema } from '@/modules/assignment/validation'

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['assignment:read'], rateLimit: 'default', validate: { body: suggestSchema } },
  async ({ ctx, body }) => {
    const services = await createServices()
    const input = body as { required_skills?: string[]; starts_at?: string; ends_at?: string; limit?: number }
    const suggestions = await services.assignmentModule.suggestCandidates(
      ctx.tenant!.id,
      ctx.userId!,
      input.required_skills ?? [],
      input.starts_at,
      input.ends_at,
      input.limit
    )
    return { payload: suggestions }
  }
)
