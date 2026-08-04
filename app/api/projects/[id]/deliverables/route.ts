import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { createDeliverableSchema, updateDeliverableSchema } from '@/modules/project/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['project:read'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const deliverables = await services.projectModule.listDeliverables(ctx.tenant!.id, params!.id)
    return { payload: deliverables }
  }
)

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['project:manage'], rateLimit: 'default', validate: { body: createDeliverableSchema } },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const result = await services.projectModule.createDeliverable(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      body as Record<string, unknown>
    )
    if (!result.ok) throw new AppError('NOT_FOUND', result.error, 404)
    return { payload: result.deliverable }
  }
)

export const PATCH = withApiHandler(
  { auth: 'manager', permissions: ['project:manage'], rateLimit: 'default', validate: { body: updateDeliverableSchema } },
  async ({ ctx, params, body, searchParams }) => {
    const deliverableId = searchParams.get('deliverable_id')
    if (!deliverableId) throw new AppError('VALIDATION_ERROR', 'deliverable_id query param required', 400)

    const services = await createServices()
    const result = await services.projectModule.updateDeliverable(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      deliverableId,
      body as Record<string, unknown>
    )
    if (!result.ok) throw new AppError('NOT_FOUND', result.error, 404)
    return { payload: result.deliverable }
  }
)
