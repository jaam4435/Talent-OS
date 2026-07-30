import type { MarketplaceToolInputs } from '@/lib/mcp/servers/marketplace.server'
import type { MarketplaceSubdomain } from '@/modules/marketplace/types'
import { mcpErr, mcpOk, type McpToolHandlerFn } from '@/lib/mcp/adapters/helpers'

function asInput<T>(input: unknown): T {
  return input as T
}

export const MARKETPLACE_ADAPTER_HANDLERS: Record<string, McpToolHandlerFn> = {
  marketplace_search_profiles: async (input, ctx) => {
    const data = asInput<MarketplaceToolInputs['marketplace_search_profiles']>(input)
    const result = await ctx.services.marketplace.searchPublicProfiles(ctx.execution.tenantId, data)
    return mcpOk(result)
  },

  marketplace_get_public_profile: async (input, ctx) => {
    const { freelancer_id } = asInput<MarketplaceToolInputs['marketplace_get_public_profile']>(input)
    const profile = await ctx.services.marketplace.getPublicProfile(
      freelancer_id,
      ctx.execution.tenantId
    )
    if (!profile) return mcpErr('Profile not found', 'NOT_FOUND')
    return mcpOk(profile)
  },

  marketplace_get_match_scores: async (input, ctx) => {
    const { opportunity_id } = asInput<MarketplaceToolInputs['marketplace_get_match_scores']>(input)
    const scores = await ctx.services.marketplace.getMatchScores(
      opportunity_id,
      ctx.execution.tenantId
    )
    return mcpOk({ scores })
  },

  marketplace_request_match: async (input, ctx) => {
    const { opportunity_id } = asInput<MarketplaceToolInputs['marketplace_request_match']>(input)
    const result = await ctx.services.marketplace.requestMatch({
      tenantId: ctx.execution.tenantId,
      opportunityId: opportunity_id,
      actorId: ctx.execution.userId,
    })
    return mcpOk(result)
  },

  marketplace_list_boundaries: async (_input, ctx) => {
    const boundaries = ctx.services.marketplace.listBoundaries()
    return mcpOk({ boundaries })
  },

  marketplace_get_boundary: async (input, ctx) => {
    const { subdomain } = asInput<MarketplaceToolInputs['marketplace_get_boundary']>(input)
    const boundary = ctx.services.marketplace.getSubdomainBoundary(subdomain as MarketplaceSubdomain)
    return mcpOk(boundary)
  },
}
