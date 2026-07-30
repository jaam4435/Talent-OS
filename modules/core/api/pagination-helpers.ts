export interface PaginationParams {
  page: number
  limit: number
  offset: number
  sort?: string
  order: 'asc' | 'desc'
}

export interface PaginationMeta {
  page: number
  limit: number
  total?: number
  hasMore?: boolean
}

export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)))
  const offset = (page - 1) * limit
  const sort = searchParams.get('sort') ?? undefined
  const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc'
  return { page, limit, offset, sort, order }
}

export function paginationMeta(
  params: Pick<PaginationParams, 'page' | 'limit'>,
  total?: number
): PaginationMeta {
  return {
    page: params.page,
    limit: params.limit,
    total,
    hasMore: total !== undefined ? params.page * params.limit < total : undefined,
  }
}
