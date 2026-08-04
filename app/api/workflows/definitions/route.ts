import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { createDefinitionSchema, listQuerySchema } from '@/modules/workflow-engine/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['workflow:read'], rateLimit: 'default', validate: { query: listQuerySchema } },
  async ({ ctx, searchParams }) => {
    const services = await createServices()
    const source = searchParams.get('source') ?? 'registry'

    if (source === 'stored') {
      const result = await services.workflowEngineModule.listStoredDefinitions(ctx.tenant!.id, {
        page: Number(searchParams.get('page') ?? 1),
        limit: Number(searchParams.get('limit') ?? 20),
        category: searchParams.get('category') ?? undefined,
      })
      return {
        payload: result.data,
        meta: { page: result.page, limit: result.limit, total: result.total, hasMore: result.hasMore },
      }
    }

    return {
      payload: services.workflowEngineModule.listRegistryDefinitions(),
      meta: { source: 'registry' },
    }
  }
)

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['workflow:manage'], rateLimit: 'default', validate: { body: createDefinitionSchema } },
  async ({ ctx, body }) => {
    const services = await createServices()
    const record = await services.workflowEngineModule.createCustomDefinition(
      ctx.tenant!.id,
      ctx.userId!,
      body as Record<string, unknown>
    )
    return { payload: record }
  }
)
