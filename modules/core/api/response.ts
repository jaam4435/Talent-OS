import { NextResponse } from 'next/server'
import type { ApiErrorBody, ApiSuccess } from '@/modules/core/types/api'

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function success<T>(data: T, meta?: ApiSuccess<T>['meta']) {
  return NextResponse.json({ data, meta } satisfies ApiSuccess<T>)
}

export function error(
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    { error: { code, message, details } } satisfies ApiErrorBody,
    { status }
  )
}

export function handleApiError(err: unknown) {
  if (err instanceof AppError) {
    return error(err.code, err.message, err.status, err.details)
  }
  console.error(err)
  return error('INTERNAL_ERROR', 'An unexpected error occurred', 500)
}
