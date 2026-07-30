import type { KnowledgeToolInputs } from '@/lib/mcp/servers/knowledge.server'
import { ORG_KNOWLEDGE_METADATA_KEYS } from '@/modules/knowledge/types'
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

  knowledge_semantic_search: async (input, ctx) => {
    const data = asInput<KnowledgeToolInputs['knowledge_semantic_search']>(input)
    const result = await ctx.services.knowledge.semanticSearch(ctx.execution.tenantId, {
      query: data.query,
      categories: data.categories as import('@/modules/knowledge/types').KnowledgeCategory[] | undefined,
      limit: data.limit,
    })
    if (!result.ok) return mcpErr(result.error)
    return mcpOk(paginate(result.results, data.page, data.limit))
  },

  knowledge_get_entry: async (input, ctx) => {
    const data = asInput<KnowledgeToolInputs['knowledge_get_entry']>(input)
    const entry = await ctx.services.knowledge.getEntry(data.entry_id, ctx.execution.tenantId)
    if (!entry) return mcpErr('Knowledge entry not found')
    return mcpOk(entry)
  },

  knowledge_create_entry: async (input, ctx) => {
    const data = asInput<KnowledgeToolInputs['knowledge_create_entry']>(input)
    const metadata: Record<string, unknown> = {}
    if (data.source_id) metadata[ORG_KNOWLEDGE_METADATA_KEYS.sourceId] = data.source_id
    if (data.source_module) metadata[ORG_KNOWLEDGE_METADATA_KEYS.sourceModule] = data.source_module

    const result = await ctx.services.knowledge.createEntry(
      ctx.execution.tenantId,
      ctx.execution.userId,
      {
        category: data.category as import('@/modules/knowledge/types').KnowledgeCategory,
        title: data.title,
        content: data.content,
        summary: data.summary,
        tags: data.tags,
        metadata: Object.keys(metadata).length ? metadata : undefined,
        links: {
          projectId: data.project_id,
          companyId: data.company_id,
        },
      }
    )
    if (!result.ok) return mcpErr(result.error)
    return mcpOk({ entry_id: result.entryId })
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
