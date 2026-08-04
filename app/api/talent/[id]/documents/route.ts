import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { createDocumentSchema } from '@/modules/talent/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['talent:read'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const data = await services.talentModule.listDocuments(ctx.tenant!.id, params!.id)
    return { payload: data }
  }
)

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['talent:manage'], rateLimit: 'default', validate: { body: createDocumentSchema } },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const result = await services.talentModule.addDocument(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      body as Record<string, unknown>
    )
    if (!result.ok) throw new AppError('NOT_FOUND', result.error, 404)
    return { payload: result.document }
  }
)

export const DELETE = withApiHandler(
  { auth: 'manager', permissions: ['talent:manage'], rateLimit: 'default' },
  async ({ ctx, params, searchParams }) => {
    const documentId = searchParams.get('document_id')
    if (!documentId) throw new AppError('VALIDATION_ERROR', 'document_id query param required', 400)

    const services = await createServices()
    const result = await services.talentModule.deleteDocument(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      documentId
    )
    if (!result.ok) throw new AppError('NOT_FOUND', result.error, 404)
    return { payload: { deleted: true } }
  }
)
