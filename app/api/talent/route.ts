import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { advancedSearchSchema, createTalentSchema } from '@/modules/talent/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['talent:read'], rateLimit: 'default', validate: { query: advancedSearchSchema } },
  async ({ ctx, searchParams }) => {
    const services = await createServices()
    const skills = searchParams.get('skills')?.split(',').map((s) => s.trim()).filter(Boolean)
    const tags = searchParams.get('tags')?.split(',').map((s) => s.trim()).filter(Boolean)

    const result = await services.talentModule.listTalent(ctx.tenant!.id, {
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 20),
      q: searchParams.get('q') ?? undefined,
      discipline: searchParams.get('discipline') ?? undefined,
      availability: searchParams.get('availability') ?? undefined,
      employmentType: searchParams.get('employment_type') ?? undefined,
      timezone: searchParams.get('timezone') ?? undefined,
      minCompleteness: searchParams.get('min_completeness')
        ? Number(searchParams.get('min_completeness'))
        : undefined,
      skills,
      tags,
      sort: searchParams.get('sort') ?? undefined,
      minRate: searchParams.get('min_rate') ? Number(searchParams.get('min_rate')) : undefined,
      maxRate: searchParams.get('max_rate') ? Number(searchParams.get('max_rate')) : undefined,
      minRating: searchParams.get('min_rating') ? Number(searchParams.get('min_rating')) : undefined,
    })

    return {
      payload: result.data,
      meta: { page: result.page, limit: result.limit, total: result.total, hasMore: result.hasMore },
    }
  }
)

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['talent:manage'], rateLimit: 'default', validate: { body: createTalentSchema } },
  async ({ ctx, body }) => {
    const services = await createServices()
    const talent = await services.talentModule.createTalent(
      ctx.tenant!.id,
      ctx.userId!,
      body as Record<string, unknown>,
      ctx.tenant!.currency
    )
    return { payload: talent }
  }
)
