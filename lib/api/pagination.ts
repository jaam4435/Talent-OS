export { AppError, success, error, handleApiError } from './response'

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)))
  const offset = (page - 1) * limit
  return { page, limit, offset }
}
