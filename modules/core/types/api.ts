export interface ApiSuccess<T> {
  data: T
  meta?: ApiPaginationMeta & Record<string, unknown>
}

export interface ApiPaginationMeta {
  page?: number
  limit?: number
  total?: number
  hasMore?: boolean
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody

/** Server action result — stable for SDK/action adapters. */
export interface ActionResponse<T = Record<string, never>> {
  ok: boolean
  error?: string
  code?: string
  data?: T
}
