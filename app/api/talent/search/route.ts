import { createClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/auth/session'
import { isManager } from '@/lib/auth/permissions'
import { parsePagination } from '@/lib/api/pagination'
import { success, handleApiError, AppError } from '@/lib/api/response'
import type { TalentSearchParams } from '@/lib/talent/types'

export async function GET(request: Request) {
  try {
    const { tenant } = await requireTenant()
    if (!isManager(tenant.role)) {
      throw new AppError('FORBIDDEN', 'Managers only', 403)
    }

    const { searchParams } = new URL(request.url)
    const { page, limit, offset } = parsePagination(searchParams)

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

    const supabase = await createClient()
    const { data, error } = await supabase.rpc('search_freelancers', {
      p_tenant_id: tenant.id,
      p_query: params.query ?? null,
      p_discipline: params.discipline ?? null,
      p_availability: params.availability ?? null,
      p_min_rate: params.minRate ?? null,
      p_max_rate: params.maxRate ?? null,
      p_min_rating: params.minRating ?? null,
      p_sort: params.sort ?? 'rating',
      p_limit: limit,
      p_offset: offset,
    })

    if (error) throw error

    return success(data ?? [], { page, limit, total: data?.length ?? 0 })
  } catch (error) {
    return handleApiError(error)
  }
}
