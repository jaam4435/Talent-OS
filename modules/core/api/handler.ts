import { NextResponse } from 'next/server'
import type { z } from 'zod'
import { authenticateRequest, authorizePermissions, type ApiAuthMode } from '@/modules/core/api/auth'
import {
  createRequestContext,
  type ApiRequestContext,
} from '@/modules/core/api/context'
import {
  buildIdempotencyKey,
  getIdempotentResponse,
  storeIdempotentResponse,
} from '@/modules/core/api/idempotency'
import { checkRateLimit, rateLimitKey, type RateLimitCategory } from '@/modules/core/api/rate-limit'
import { handleApiError, success, legacySuccess, AppError } from '@/modules/core/api/response'
import { validateBody, validateQuery } from '@/modules/core/api/validation'
import { createTraceIds, mergeObservabilityContext } from '@/lib/observability/context'
import { instrumentApiRequest } from '@/lib/observability/instrumentation'
import { mapToAppError } from '@/modules/core/api/error-mapper'

export interface ApiHandlerOptions {
  auth?: ApiAuthMode
  permissions?: string[]
  rateLimit?: RateLimitCategory
  idempotency?: boolean
  /** Return raw JSON body without { data } envelope — for backwards compatibility. */
  legacyEnvelope?: boolean
  validate?: {
    body?: z.ZodType<unknown>
    query?: z.ZodType<unknown>
  }
}

export type ApiHandlerResult<T> =
  | T
  | { payload: T; meta?: Record<string, unknown> }

export type ApiHandlerFn<T = unknown> = (input: {
  request: Request
  ctx: ApiRequestContext
  body: unknown
  searchParams: URLSearchParams
  params?: Record<string, string>
}) => Promise<ApiHandlerResult<T> | NextResponse>

type RouteContext = { params: Promise<Record<string, string>> }

function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

export function withApiHandler<T>(
  options: ApiHandlerOptions,
  handler: ApiHandlerFn<T>
): (request: Request, routeCtx: RouteContext) => Promise<NextResponse> {
  return async (request: Request, routeCtx: RouteContext): Promise<NextResponse> => {
    let ctx = createRequestContext(request)
    const startedAt = Date.now()
    const url = new URL(request.url)
    const traceIds = createTraceIds()
    mergeObservabilityContext({
      requestId: ctx.requestId,
      correlationId: ctx.correlationId,
      traceId: traceIds.traceId,
      spanId: traceIds.spanId,
    })

    try {
      ctx = await authenticateRequest(request, options.auth ?? 'tenant')
      mergeObservabilityContext({ tenantId: ctx.tenantId, userId: ctx.userId })

      if (options.permissions?.length) {
        authorizePermissions(ctx, options.permissions)
      }

      if (options.rateLimit) {
        const key = rateLimitKey({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          ip: clientIp(request),
        })
        const rl = await checkRateLimit(key, options.rateLimit)
        if (!rl.allowed) {
          throw new AppError('RATE_LIMITED', 'Too many requests', 429, {
            limit: rl.limit,
            resetAt: rl.resetAt,
          })
        }
      }

      let body: unknown = undefined

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        const contentType = request.headers.get('content-type') ?? ''
        if (contentType.includes('application/json')) {
          body = await request.json()
        } else if (contentType.includes('text/')) {
          body = await request.text()
        }
      }

      if (options.validate?.body && body !== undefined) {
        body = validateBody(options.validate.body, body)
      }

      if (options.validate?.query) {
        validateQuery(options.validate.query, url.searchParams)
      }

      const params = (routeCtx?.params ? await routeCtx.params : {}) ?? {}
      const resolvedParams = Object.keys(params).length > 0 ? params : undefined

      if (options.idempotency && ctx.idempotencyKey) {
        const idemKey = buildIdempotencyKey(
          ctx.tenantId,
          ctx.idempotencyKey,
          request.method,
          url.pathname
        )
        if (idemKey) {
          const cached = await getIdempotentResponse(idemKey)
          if (cached) {
            const response = NextResponse.json(cached.body, { status: cached.status })
            response.headers.set('X-Request-ID', ctx.requestId)
            response.headers.set('X-Idempotent-Replayed', 'true')
            return response
          }
        }
      }

      const raw = await handler({
        request,
        ctx,
        body,
        searchParams: url.searchParams,
        params: resolvedParams,
      })

      if (raw instanceof NextResponse) {
        raw.headers.set('X-Request-ID', ctx.requestId)
        return raw
      }

      const { payload, meta } =
        raw !== null && typeof raw === 'object' && 'payload' in raw
          ? (raw as { payload: unknown; meta?: Record<string, unknown> })
          : { payload: raw, meta: undefined }

      if (options.legacyEnvelope && payload && typeof payload === 'object') {
        const response = legacySuccess(payload as Record<string, unknown>, 200, ctx)
        if (options.idempotency && ctx.idempotencyKey) {
          const idemKey = buildIdempotencyKey(
            ctx.tenantId,
            ctx.idempotencyKey,
            request.method,
            url.pathname
          )
          if (idemKey) await storeIdempotentResponse(idemKey, 200, payload, {
            tenantId: ctx.tenantId,
            method: request.method,
            path: url.pathname,
          })
        }
        instrumentApiRequest({
          method: request.method,
          path: url.pathname,
          status: 200,
          durationMs: Date.now() - startedAt,
          context: {
            tenantId: ctx.tenantId,
            correlationId: ctx.correlationId,
            requestId: ctx.requestId,
            traceId: traceIds.traceId,
            spanId: traceIds.spanId,
            userId: ctx.userId,
          },
        })
        return response
      }

      const response = success(payload, meta, ctx)

      if (options.idempotency && ctx.idempotencyKey) {
        const idemKey = buildIdempotencyKey(
          ctx.tenantId,
          ctx.idempotencyKey,
          request.method,
          url.pathname
        )
        if (idemKey) {
          await storeIdempotentResponse(
            idemKey,
            200,
            { data: payload, meta },
            {
              tenantId: ctx.tenantId,
              method: request.method,
              path: url.pathname,
            }
          )
        }
      }

      instrumentApiRequest({
        method: request.method,
        path: url.pathname,
        status: 200,
        durationMs: Date.now() - startedAt,
        context: {
          tenantId: ctx.tenantId,
          correlationId: ctx.correlationId,
          requestId: ctx.requestId,
          traceId: traceIds.traceId,
          spanId: traceIds.spanId,
          userId: ctx.userId,
        },
      })

      return response
    } catch (err) {
      const mapped = mapToAppError(err)
      instrumentApiRequest({
        method: request.method,
        path: url.pathname,
        status: mapped.status,
        durationMs: Date.now() - startedAt,
        context: {
          tenantId: ctx.tenantId,
          correlationId: ctx.correlationId,
          requestId: ctx.requestId,
          traceId: traceIds.traceId,
          spanId: traceIds.spanId,
          userId: ctx.userId,
        },
        errorCode: mapped.code,
      })
      return handleApiError(err, ctx)
    }
  }
}

/** Instrumented wrapper for routes that cannot use withApiHandler (redirects, plain-text). */
export async function runInstrumentedRoute(
  request: Request,
  options: { path: string; rateLimit?: RateLimitCategory; method?: string },
  fn: () => Promise<NextResponse>
): Promise<NextResponse> {
  const ctx = createRequestContext(request)
  const startedAt = Date.now()
  const traceIds = createTraceIds()
  const method = options.method ?? request.method

  try {
    if (options.rateLimit) {
      const key = rateLimitKey({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        ip: clientIp(request),
      })
      const rl = await checkRateLimit(key, options.rateLimit)
      if (!rl.allowed) {
        throw new AppError('RATE_LIMITED', 'Too many requests', 429)
      }
    }

    const response = await fn()

    instrumentApiRequest({
      method,
      path: options.path,
      status: response.status,
      durationMs: Date.now() - startedAt,
      context: {
        tenantId: ctx.tenantId,
        correlationId: ctx.correlationId,
        requestId: ctx.requestId,
        traceId: traceIds.traceId,
        spanId: traceIds.spanId,
        userId: ctx.userId,
      },
    })

    return response
  } catch (err) {
    const mapped = mapToAppError(err)
    instrumentApiRequest({
      method,
      path: options.path,
      status: mapped.status,
      durationMs: Date.now() - startedAt,
      context: {
        tenantId: ctx.tenantId,
        correlationId: ctx.correlationId,
        requestId: ctx.requestId,
        traceId: traceIds.traceId,
        spanId: traceIds.spanId,
        userId: ctx.userId,
      },
      errorCode: mapped.code,
    })
    return handleApiError(err, ctx)
  }
}

/** @deprecated Use runInstrumentedRoute */
export async function runApiRoute(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  const ctx = createRequestContext(new Request('http://localhost'))
  try {
    return await fn()
  } catch (err) {
    return handleApiError(err, ctx)
  }
}
