import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { updateKnowledgeEntrySchema } from '@/modules/knowledge/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['ai:summary'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const entry = await services.knowledge.getEntry(params!.id, ctx.tenant!.id)
    if (!entry) throw new AppError('NOT_FOUND', 'Knowledge entry not found', 404)
    return { payload: entry }
  }
)

export const PATCH = withApiHandler(
  {
    auth: 'manager',
    permissions: ['ai:summary'],
    rateLimit: 'default',
    validate: { body: updateKnowledgeEntrySchema },
  },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const result = await services.knowledge.updateEntry(
      params!.id,
      ctx.tenant!.id,
      ctx.userId!,
      body as never
    )
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    const entry = await services.knowledge.getEntry(params!.id, ctx.tenant!.id)
    return { payload: entry }
  }
)

export const DELETE = withApiHandler(
  { auth: 'manager', permissions: ['ai:summary'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const result = await services.knowledge.deleteEntry(params!.id, ctx.tenant!.id)
    if (!result.ok) throw new AppError('NOT_FOUND', result.error, 404)
    return { payload: { deleted: true } }
  }
)
