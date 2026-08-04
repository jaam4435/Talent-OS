import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { createKnowledgeEntrySchema, listKnowledgeQuerySchema } from '@/modules/knowledge/validation'
import type { KnowledgeCategory } from '@/modules/knowledge/types'

export const GET = withApiHandler(
  {
    auth: 'manager',
    permissions: ['ai:summary'],
    rateLimit: 'default',
    validate: { query: listKnowledgeQuerySchema },
  },
  async ({ ctx, searchParams }) => {
    const services = await createServices()
    const result = await services.knowledge.listEntries(ctx.tenant!.id, {
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 20),
      category: (searchParams.get('category') as KnowledgeCategory | null) ?? undefined,
      query: searchParams.get('q') ?? undefined,
    })
    return {
      payload: result.data,
      meta: { page: result.page, limit: result.limit, total: result.total, hasMore: result.hasMore },
    }
  }
)

export const POST = withApiHandler(
  {
    auth: 'manager',
    permissions: ['ai:summary'],
    rateLimit: 'default',
    validate: { body: createKnowledgeEntrySchema },
  },
  async ({ ctx, body }) => {
    const services = await createServices()
    const result = await services.knowledge.createEntry(ctx.tenant!.id, ctx.userId!, body as never)
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return { payload: { id: result.entryId } }
  }
)
