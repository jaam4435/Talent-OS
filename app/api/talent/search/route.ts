import { parsePagination } from '@/modules/core/api/pagination'
import { success, handleApiError, AppError } from '@/modules/core/api/response'
import { requireTenant } from '@/modules/core/services/session'
import { isManager } from '@/modules/core/services/permissions'
import { createTalentServices } from '@/lib/domains/talent/factory'
import type { TalentSearchParams } from '@/lib/talent/types'

export async function GET(request: Request) {
  try {
    const { tenant } = await requireTenant()
    if (!isManager(tenant.role)) {
      throw new AppError('FORBIDDEN', 'Managers only', 403)
    }

    const { searchParams } = new URL(request.url)
    const { page, limit } = parsePagination(searchParams)

    const params: TalentSearchParams = {
      query: searchParams.get('q') ?? undefined,
      discipline: (searchParams.get('discipline') as TalentSearchParams['discipline']) ?? undefined,
      availability: (searchParams.get('availability') as TalentSearchParams['availability']) ?? undefined,
      minRate: searchParams.get('minRate') ? Number(searchParams.get('minRate')) : undefined,
      maxRate: searchParams.get('maxRate') ? Number(searchParams.get('maxRate')) : undefined,
      minRating: searchParams.get('minRating') ? Number(searchParams.get('minRating')) : undefined,
      sort: (searchParams.get('sort') as TalentSearchParams['sort']) ?? 'rating',
      page,
      limit,
    }

    const { talent } = await createTalentServices()
    const data = await talent.searchRoster(tenant.id, params)

    return success(data, { page, limit, total: data.length })
  } catch (error) {
    return handleApiError(error)
  }
}
