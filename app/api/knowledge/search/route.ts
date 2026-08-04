import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { knowledgeSearchSchema } from '@/modules/knowledge/validation'

export const POST = withApiHandler(
  {
    auth: 'manager',
    permissions: ['ai:summary'],
    rateLimit: 'default',
    validate: { body: knowledgeSearchSchema },
  },
  async ({ ctx, body }) => {
    const services = await createServices()
    const result = await services.knowledge.search(ctx.tenant!.id, body as never)
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return { payload: result.results }
  }
)
