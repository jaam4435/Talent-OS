import { NextResponse } from 'next/server'
import type { ApiErrorBody, ApiSuccess } from '@/modules/core/types/api'
import { mapToAppError } from '@/modules/core/api/error-mapper'
import {
  API_VERSION_HEADER,
  DEFAULT_API_VERSION,
  type ApiRequestContext,
} from '@/modules/core/api/context'

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

export function success<T>(
  data: T,
  meta?: ApiSuccess<T>['meta'],
  ctx?: Pick<ApiRequestContext, 'requestId' | 'apiVersion'>
) {
  const response = NextResponse.json({ data, meta } satisfies ApiSuccess<T>)
  applyStandardHeaders(response, ctx)
  return response
}

/** Legacy envelope for backwards-compatible endpoints (health, webhooks). */
export function legacySuccess<T extends Record<string, unknown>>(
  body: T,
  status = 200,
  ctx?: Pick<ApiRequestContext, 'requestId' | 'apiVersion'>
) {
  const response = NextResponse.json(body, { status })
  applyStandardHeaders(response, ctx)
  return response
}

export function error(
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>,
  ctx?: Pick<ApiRequestContext, 'requestId' | 'apiVersion'>
) {
  const response = NextResponse.json(
    { error: { code, message, details } } satisfies ApiErrorBody,
    { status }
  )
  applyStandardHeaders(response, ctx)
  return response
}

export function handleApiError(
  err: unknown,
  ctx?: Pick<ApiRequestContext, 'requestId' | 'apiVersion'>
) {
  const mapped = mapToAppError(err)
  return error(mapped.code, mapped.message, mapped.status, mapped.details, ctx)
}

function applyStandardHeaders(
  response: NextResponse,
  ctx?: Pick<ApiRequestContext, 'requestId' | 'apiVersion'>
) {
  response.headers.set(API_VERSION_HEADER, ctx?.apiVersion ?? DEFAULT_API_VERSION)
  if (ctx?.requestId) {
    response.headers.set('X-Request-ID', ctx.requestId)
  }
}
