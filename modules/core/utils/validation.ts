import type { ZodSchema } from 'zod'
import { DomainError, ErrorCodes } from '@/modules/core/utils/errors'

export function firstZodErrorMessage(error: { errors: { message?: string }[] }): string {
  return error.errors[0]?.message ?? 'Invalid input'
}

export function parseSchema<T>(schema: ZodSchema<T>, input: unknown): T {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    throw new DomainError(ErrorCodes.VALIDATION, firstZodErrorMessage(parsed.error))
  }
  return parsed.data
}

export function safeParseSchema<T>(
  schema: ZodSchema<T>,
  input: unknown
): { success: true; data: T } | { success: false; error: string } {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: firstZodErrorMessage(parsed.error) }
  }
  return { success: true, data: parsed.data }
}
