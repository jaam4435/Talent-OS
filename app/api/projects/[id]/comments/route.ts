import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { createCommentSchema } from '@/modules/project/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['project:read'], rateLimit: 'default' },
  async ({ ctx, params, searchParams }) => {
    const services = await createServices()
    const comments = await services.projectModule.listComments(
      ctx.tenant!.id,
      params!.id,
      searchParams.get('entity_type') ?? undefined,
      searchParams.get('entity_id') ?? undefined
    )
    return { payload: comments }
  }
)

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['project:manage'], rateLimit: 'default', validate: { body: createCommentSchema } },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const input = body as { entity_type: string; entity_id: string; body: string }
    const result = await services.projectModule.addComment(ctx.tenant!.id, ctx.userId!, params!.id, input)
    if (!result.ok) throw new AppError('NOT_FOUND', result.error, 404)
    return { payload: result.comment }
  }
)
