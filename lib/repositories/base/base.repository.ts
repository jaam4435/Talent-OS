import type { PostgrestError } from '@supabase/supabase-js'
import { DomainError, ErrorCodes } from '@/modules/core/utils/errors'
import { mapSupabaseError, throwIfSupabaseError } from '@/modules/core/utils/supabase-errors'
import type { RepositoryContext } from '@/modules/core/utils/context'
import { globalRepositoryCache } from '@/lib/repositories/base/cache'
import type { PaginationParams, RepositoryQueryOptions } from '@/lib/repositories/base/types'
import { resolvePagination } from '@/lib/repositories/base/types'

export abstract class BaseRepository {
  protected readonly cache = globalRepositoryCache

  constructor(protected readonly ctx: RepositoryContext) {}

  protected throwIfError(error: PostgrestError | null, duplicateMessage?: string): void {
    throwIfSupabaseError(error, duplicateMessage)
  }

  protected mapError(error: PostgrestError, duplicateMessage?: string): DomainError {
    return mapSupabaseError(error, duplicateMessage)
  }

  protected notFound(entity: string): never {
    throw new DomainError(ErrorCodes.NOT_FOUND, `${entity} not found`)
  }

  protected async withCache<T>(
    key: string,
    ttlMs: number | undefined,
    fn: () => Promise<T>
  ): Promise<T> {
    if (ttlMs && ttlMs > 0) {
      const cached = this.cache.get<T>(key)
      if (cached !== undefined) return cached
    }

    const result = await fn()

    if (ttlMs && ttlMs > 0) {
      this.cache.set(key, result, ttlMs)
    }

    return result
  }

  protected paginate(params?: PaginationParams) {
    return resolvePagination(params)
  }

  protected cacheKey(table: string, parts: Record<string, unknown>): string {
    return `${table}:${JSON.stringify(parts)}`
  }

  protected invalidateTable(table: string): void {
    this.cache.invalidate(`${table}:`)
  }

  protected get options(): RepositoryQueryOptions | undefined {
    return undefined
  }
}
