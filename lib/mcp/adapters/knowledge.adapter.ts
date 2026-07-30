import type { KnowledgeToolInputs } from '@/lib/mcp/servers/knowledge.server'
import { mcpErr, mcpOk, paginate, type McpToolHandlerFn } from '@/lib/mcp/adapters/helpers'

function asInput<T>(input: unknown): T {
  return input as T
}

export const KNOWLEDGE_ADAPTER_HANDLERS: Record<string, McpToolHandlerFn> = {
  knowledge_get_entity_context: async (input, ctx) => {
    const data = asInput<KnowledgeToolInputs['knowledge_get_entity_context']>(input)
    const context = await ctx.services.knowledge.getEntityContext(
      ctx.execution.tenantId,
      data.entity_type,
      data.entity_id,
      data.depth ?? 'standard'
    )
    return mcpOk(context)
  },

  knowledge_list_related_records: async (input, ctx) => {
    const data = asInput<KnowledgeToolInputs['knowledge_list_related_records']>(input)
    const records = await ctx.services.knowledge.listRelatedRecords(
      ctx.execution.tenantId,
      data.entity_type,
      data.entity_id,
      data.relation
    )
    return mcpOk(records)
  },

  knowledge_search: async (input, ctx) => {
    const data = asInput<KnowledgeToolInputs['knowledge_search']>(input)
    const result = await ctx.services.knowledge.search(ctx.execution.tenantId, {
      query: data.query,
    })
    if (!result.ok) return mcpErr(result.error)
    return mcpOk(paginate(result.results, data.page, data.limit))
  },

  knowledge_get_tenant_policies: async (_input, ctx) => {
    const policies = await ctx.services.knowledge.getTenantPolicies(ctx.execution.tenantId)
    return mcpOk(policies)
  },

  knowledge_get_schema_reference: async (input, ctx) => {
    const data = asInput<KnowledgeToolInputs['knowledge_get_schema_reference']>(input)
    const schema = ctx.services.knowledge.getSchemaReference(data.entity_type)
    return mcpOk(schema)
  },
}
