import type { TalentToolInputs } from '@/lib/mcp/servers/talent.server'
import { mcpErr, mcpOk, paginate, tenantContext, type McpToolHandlerFn } from '@/lib/mcp/adapters/helpers'

function asInput<T>(input: unknown): T {
  return input as T
}

export const TALENT_ADAPTER_HANDLERS: Record<string, McpToolHandlerFn> = {
  talent_search: async (input, ctx) => {
    const data = asInput<TalentToolInputs['talent_search']>(input)
    const roster = await ctx.services.talent.searchRoster(ctx.execution.tenantId, {
      query: data.query,
      discipline: data.discipline as never,
      availability: data.availability as never,
      minRate: data.min_rate,
      maxRate: data.max_rate,
      minRating: data.min_rating,
      sort: data.sort as never,
    })
    return mcpOk(paginate(roster, data.page, data.limit))
  },

  talent_get_profile: async (input, ctx) => {
    const { freelancer_id } = asInput<TalentToolInputs['talent_get_profile']>(input)
    const profile = await ctx.services.talent.getTalentProfile(freelancer_id, ctx.execution.tenantId)
    if (!profile) return mcpErr('Freelancer not found', 'NOT_FOUND')
    return mcpOk(profile)
  },

  talent_create_profile: async (input, ctx) => {
    const data = asInput<TalentToolInputs['talent_create_profile']>(input)
    const result = await ctx.services.talent.createFreelancer(tenantContext(ctx.execution), {
      fullName: data.full_name,
      email: data.email,
      discipline: data.discipline as never,
      skills: data.skills,
      dayRate: data.day_rate,
      availability: (data.availability as never) ?? 'available',
      bio: data.bio,
    })
    if (!result.ok) return mcpErr(result.error)
    return mcpOk({ id: result.freelancerId })
  },

  talent_update_profile: async (input, ctx) => {
    const data = asInput<TalentToolInputs['talent_update_profile']>(input)
    const result = await ctx.services.talent.updateFreelancer(
      data.freelancer_id,
      tenantContext(ctx.execution),
      {
        fullName: data.full_name ?? '',
        email: '',
        discipline: 'other',
        skills: data.skills ?? [],
        dayRate: data.day_rate,
        availability: data.availability as never,
        internalRating: data.internal_rating,
        internalNotes: data.internal_notes,
      }
    )
    if (!result.ok) return mcpErr(result.error)
    return mcpOk({ id: data.freelancer_id, success: true })
  },

  talent_list_portfolio: async (input, ctx) => {
    const { freelancer_id } = asInput<TalentToolInputs['talent_list_portfolio']>(input)
    const items = await ctx.services.portfolio.getItems(freelancer_id)
    return mcpOk({ items })
  },

  talent_add_portfolio_item: async (input, ctx) => {
    const data = asInput<TalentToolInputs['talent_add_portfolio_item']>(input)
    const result = await ctx.services.portfolio.addItem(data.freelancer_id, {
      title: data.title,
      description: data.description,
      projectUrl: data.project_url,
      imagePath: data.image_path,
    })
    if (!result.ok) return mcpErr(result.error)
    return mcpOk({ id: result.itemId })
  },

  talent_get_rating_history: async (input, ctx) => {
    const { freelancer_id } = asInput<TalentToolInputs['talent_get_rating_history']>(input)
    const history = await ctx.services.talent.getRatingHistory(freelancer_id)
    return mcpOk({ history })
  },
}
