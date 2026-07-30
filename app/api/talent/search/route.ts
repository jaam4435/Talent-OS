import { withApiHandler } from '@/modules/core/api/handler'
import { paginationMeta, parsePagination } from '@/modules/core/api/pagination'
import { AppError } from '@/modules/core/api/response'
import { isManager } from '@/modules/core/services/permissions'
import { createTalentServices } from '@/lib/domains/talent/factory'
import type { TalentSearchParams } from '@/lib/talent/types'

export const GET = withApiHandler(
  { auth: 'tenant', rateLimit: 'search' },
  async ({ request, ctx }) => {
    if (!ctx.tenant || !isManager(ctx.tenant.role)) {
      throw new AppError('FORBIDDEN', 'Managers only', 403)
    }

    const { searchParams } = new URL(request.url)
    const pagination = parsePagination(searchParams)

    const params: TalentSearchParams = {
      query: searchParams.get('q') ?? undefined,
      discipline: (searchParams.get('discipline') as TalentSearchParams['discipline']) ?? undefined,
      availability:
        (searchParams.get('availability') as TalentSearchParams['availability']) ?? undefined,
      minRate: searchParams.get('minRate') ? Number(searchParams.get('minRate')) : undefined,
      maxRate: searchParams.get('maxRate') ? Number(searchParams.get('maxRate')) : undefined,
      minRating: searchParams.get('minRating') ? Number(searchParams.get('minRating')) : undefined,
      sort: (searchParams.get('sort') as TalentSearchParams['sort']) ?? 'rating',
      page: pagination.page,
      limit: pagination.limit,
    }

    const { talent } = await createTalentServices()
    const data = await talent.searchRoster(ctx.tenant.id, params)

    return {
      payload: data,
      meta: paginationMeta(pagination, data.length) as unknown as Record<string, unknown>,
    }
  }
)
