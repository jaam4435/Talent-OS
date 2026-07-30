import type { ApiErrorCode } from '@/modules/core/api/errors'
import { apiErrorStatus } from '@/modules/core/api/errors'
import { AppError } from '@/modules/core/api/response'
import { DomainError, ErrorCodes, isDomainError } from '@/modules/core/utils/errors'

const SESSION_ERROR_MAP: Record<string, ApiErrorCode> = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  NO_TENANT: 'NO_TENANT',
}

const MESSAGE_ERROR_MAP: Record<string, ApiErrorCode> = {
  FORBIDDEN: 'FORBIDDEN',
  AI_MATCHING_DISABLED: 'AI_MATCHING_DISABLED',
  AI_MONTHLY_LIMIT_EXCEEDED: 'AI_MONTHLY_LIMIT_EXCEEDED',
  OPPORTUNITY_NOT_FOUND: 'NOT_FOUND',
}

const DOMAIN_ERROR_MAP: Record<string, ApiErrorCode> = {
  [ErrorCodes.VALIDATION]: 'VALIDATION_ERROR',
  [ErrorCodes.NOT_FOUND]: 'NOT_FOUND',
  [ErrorCodes.FORBIDDEN]: 'FORBIDDEN',
  [ErrorCodes.DUPLICATE]: 'DUPLICATE',
  [ErrorCodes.DATABASE]: 'INTERNAL_ERROR',
}

/** Map any thrown value to a standard AppError. */
export function mapToAppError(err: unknown): AppError {
  if (err instanceof AppError) return err

  if (isDomainError(err)) {
    const code = DOMAIN_ERROR_MAP[err.code] ?? 'INTERNAL_ERROR'
    return new AppError(code, err.message, apiErrorStatus(code))
  }

  if (err instanceof Error) {
    const sessionCode = SESSION_ERROR_MAP[err.message]
    if (sessionCode) {
      return new AppError(sessionCode, humanMessage(sessionCode), apiErrorStatus(sessionCode))
    }

    if (err.message.startsWith('FORBIDDEN')) {
      return new AppError('FORBIDDEN', err.message.replace(/^FORBIDDEN:?\s*/, ''), 403)
    }

    const messageCode = MESSAGE_ERROR_MAP[err.message]
    if (messageCode) {
      return new AppError(messageCode, humanMessage(messageCode), apiErrorStatus(messageCode))
    }
  }

  console.error(err)
  return new AppError('INTERNAL_ERROR', 'An unexpected error occurred', 500)
}

function humanMessage(code: ApiErrorCode): string {
  switch (code) {
    case 'UNAUTHORIZED':
      return 'Authentication required'
    case 'NO_TENANT':
      return 'Tenant context required'
    case 'FORBIDDEN':
      return 'Insufficient permissions'
    case 'NOT_FOUND':
      return 'Resource not found'
    case 'AI_MATCHING_DISABLED':
      return 'AI matching is disabled for this tenant'
    case 'AI_MONTHLY_LIMIT_EXCEEDED':
      return 'Monthly AI request limit exceeded'
    default:
      return code
  }
}
