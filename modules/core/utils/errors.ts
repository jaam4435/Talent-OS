export const ErrorCodes = {
  VALIDATION: 'VALIDATION',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  DUPLICATE: 'DUPLICATE',
  DATABASE: 'DATABASE',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

export class DomainError extends Error {
  readonly code: ErrorCode

  constructor(code: ErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'DomainError'
    this.code = code
    if (cause !== undefined) {
      this.cause = cause
    }
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError
}
