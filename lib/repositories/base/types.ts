export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface PaginatedResult<T> {
  data: T[]
  page: number
  limit: number
  total?: number
  hasMore: boolean
}

export interface SortParams {
  column: string
  ascending?: boolean
}

export interface TenantScopedFilter {
  tenantId: string
}

export interface RepositoryQueryOptions {
  pagination?: PaginationParams
  sort?: SortParams
  cacheTtlMs?: number
  cacheKey?: string
}

export function resolvePagination(params?: PaginationParams): { limit: number; offset: number; page: number } {
  const limit = Math.min(Math.max(params?.limit ?? 20, 1), 100)
  const page = Math.max(params?.page ?? 1, 1)
  const offset = params?.offset ?? (page - 1) * limit
  return { limit, offset, page }
}

export function toPaginatedResult<T>(
  data: T[],
  pagination: { limit: number; page: number },
  total?: number
): PaginatedResult<T> {
  return {
    data,
    page: pagination.page,
    limit: pagination.limit,
    total,
    hasMore: total !== undefined ? pagination.page * pagination.limit < total : data.length >= pagination.limit,
  }
}
