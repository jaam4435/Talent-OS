import { z } from 'zod'
import { AppError } from '@/modules/core/api/response'
import { parseSchema } from '@/modules/core/utils/validation'

export function validateBody<T>(schema: z.ZodType<T>, body: unknown): T {
  try {
    return parseSchema(schema, body)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request body'
    throw new AppError('VALIDATION_ERROR', message, 400)
  }
}

export function validateQuery<T>(schema: z.ZodType<T>, searchParams: URLSearchParams): T {
  const raw = Object.fromEntries(searchParams.entries())
  try {
    return parseSchema(schema, raw)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid query parameters'
    throw new AppError('VALIDATION_ERROR', message, 400)
  }
}

export const uuidParamSchema = z.object({
  id: z.string().uuid(),
})

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>
