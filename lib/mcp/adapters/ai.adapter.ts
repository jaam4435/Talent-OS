import { getAiGateway, globalPromptManager } from '@/lib/ai'
import type { AiToolInputs } from '@/lib/mcp/servers/ai.server'
import { mcpErr, mcpOk, type McpToolHandlerFn } from '@/lib/mcp/adapters/helpers'

function asInput<T>(input: unknown): T {
  return input as T
}

export const AI_ADAPTER_HANDLERS: Record<string, McpToolHandlerFn> = {
  ai_match_talent: async (input, ctx) => {
    const data = asInput<AiToolInputs['ai_match_talent']>(input)
    const result = await ctx.services.ai.requestTalentMatch({
      tenantId: ctx.execution.tenantId,
      opportunityId: data.opportunity_id,
      actorId: ctx.execution.userId,
      correlationId: ctx.execution.correlationId,
    })
    return mcpOk({ id: result.aiRequestId, status: result.status })
  },

  ai_parse_brief: async (input, ctx) => {
    const data = asInput<AiToolInputs['ai_parse_brief']>(input)
    if (data.async === false) {
      const parsed = await ctx.services.ai.parseBriefText({
        title: data.title,
        description: data.description,
        budget: data.budget,
        currency: data.currency,
      })
      return mcpOk(parsed)
    }
    return mcpErr('Async brief parse requires opportunity_id via domain action')
  },

  ai_project_summary: async (input, ctx) => {
    const data = asInput<AiToolInputs['ai_project_summary']>(input)
    const result = await ctx.services.ai.requestProjectSummary({
      tenantId: ctx.execution.tenantId,
      projectId: data.project_id,
      actorId: ctx.execution.userId,
    })
    return mcpOk(result)
  },

  ai_shortlist_summary: async (input, ctx) => {
    const data = asInput<AiToolInputs['ai_shortlist_summary']>(input)
    const result = await ctx.services.ai.requestShortlistSummary({
      tenantId: ctx.execution.tenantId,
      opportunityId: data.opportunity_id,
      actorId: ctx.execution.userId,
    })
    return mcpOk(result)
  },

  ai_status_assessment: async (input, ctx) => {
    const data = asInput<AiToolInputs['ai_status_assessment']>(input)
    const result = await ctx.services.ai.requestStatusAssessment({
      tenantId: ctx.execution.tenantId,
      projectId: data.project_id,
      actorId: ctx.execution.userId,
    })
    return mcpOk(result)
  },

  ai_get_request_status: async (input, ctx) => {
    const { ai_request_id } = asInput<AiToolInputs['ai_get_request_status']>(input)
    const request = await ctx.services.ai.findById(ai_request_id)
    if (!request || request.tenant_id !== ctx.execution.tenantId) {
      return mcpErr('AI request not found', 'NOT_FOUND')
    }
    return mcpOk(request)
  },

  ai_complete: async (input, ctx) => {
    const data = asInput<AiToolInputs['ai_complete']>(input)
    const gateway = getAiGateway()
    const result = await gateway.completeStructured({
      messages: data.messages,
      schema: data.schema as never,
      tenantId: ctx.execution.tenantId,
      feature: data.feature as never,
      promptId: data.prompt_id,
      promptVersion: data.prompt_version,
      provider: data.provider as never,
      temperature: data.temperature,
    })
    return mcpOk(result)
  },

  ai_list_prompts: async () => {
    const promptIds = [
      'talent_match',
      'brief_parse',
      'project_summary',
      'status_assessment',
      'shortlist_summary',
      'whatsapp.agent',
    ]
    const prompts = promptIds.map((id) => ({
      id,
      versions: globalPromptManager.listVersions(id),
    }))
    return mcpOk({ prompts })
  },
}
