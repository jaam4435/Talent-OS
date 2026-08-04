import { TalentOsApiError } from '@/lib/api/client'
import { ApiErrorCodes } from '@/modules/core/api/errors'

const USER_MESSAGES: Record<string, string> = {
  [ApiErrorCodes.UNAUTHORIZED]: 'Your session expired. Please sign in again.',
  [ApiErrorCodes.NO_TENANT]: 'No workspace selected. Choose or create a workspace.',
  [ApiErrorCodes.FORBIDDEN]: 'You do not have permission to perform this action.',
  [ApiErrorCodes.NOT_FOUND]: 'The requested item could not be found.',
  [ApiErrorCodes.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ApiErrorCodes.DUPLICATE]: 'This record already exists.',
  [ApiErrorCodes.RATE_LIMITED]: 'Too many requests. Please wait a moment and try again.',
  [ApiErrorCodes.IDEMPOTENCY_CONFLICT]: 'This request was already processed.',
  [ApiErrorCodes.INTERNAL_ERROR]: 'Something went wrong on our end. Please try again later.',
  [ApiErrorCodes.AI_MATCHING_DISABLED]: 'AI matching is disabled for this organization.',
  [ApiErrorCodes.AI_MONTHLY_LIMIT_EXCEEDED]: 'The monthly AI usage limit has been reached.',
}

export function getUserMessageForApiError(error: unknown): string {
  if (error instanceof TalentOsApiError) {
    return USER_MESSAGES[error.code] ?? error.message
  }
  if (error instanceof Error) return error.message
  return USER_MESSAGES[ApiErrorCodes.INTERNAL_ERROR]
}

export function getUserMessageForErrorCode(code: string, fallback?: string): string {
  return USER_MESSAGES[code] ?? fallback ?? USER_MESSAGES[ApiErrorCodes.INTERNAL_ERROR]
}
