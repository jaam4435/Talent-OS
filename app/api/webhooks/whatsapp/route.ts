import { NextResponse } from 'next/server'
import { handleApiError, AppError } from '@/modules/core/api/response'
import { checkRateLimit, rateLimitKey } from '@/modules/core/api/rate-limit'
import { verifyMetaSignature } from '@/lib/integrations/encryption'
import { assertProductionSecrets, requireWebhookSecret } from '@/lib/env'
import { parseMetaWebhook } from '@/lib/whatsapp/parser'
import { buildN8nEnvelope, dispatchToN8n } from '@/lib/integrations/n8n'
import { createAdminServices } from '@/lib/services/factory'
import { instrumentApiRequest } from '@/lib/observability/instrumentation'
import { createTraceIds } from '@/lib/observability/context'
import type { Json } from '@/modules/core/types/database'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(request: Request) {
  const startedAt = Date.now()
  const traceIds = createTraceIds()
  const path = '/api/webhooks/whatsapp'

  try {
    assertProductionSecrets()

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'
    const rl = checkRateLimit(rateLimitKey({ ip }), 'webhook')
    if (!rl.allowed) {
      throw new AppError('RATE_LIMITED', 'Too many requests', 429)
    }

    const rawBody = await request.text()
    const signature = request.headers.get('x-hub-signature-256')
    const appSecret = requireWebhookSecret('WHATSAPP_APP_SECRET', process.env.WHATSAPP_APP_SECRET)

    if (appSecret && !verifyMetaSignature(rawBody, appSecret, signature)) {
      throw new AppError('WEBHOOK_INVALID_SIGNATURE', 'Invalid signature', 401)
    }

    const body = JSON.parse(rawBody)
    const { inbound, statuses } = parseMetaWebhook(body)
    const services = await createAdminServices()

    for (const status of statuses) {
      const idempotencyKey = `wa-status:${status.waMessageId}:${status.status}`
      const existing = await services.integration.findWebhookDelivery('whatsapp', idempotencyKey)
      if (existing) continue

      await services.integration.createWebhookDelivery({
        source: 'whatsapp',
        idempotency_key: idempotencyKey,
        event_type: 'status_update',
        payload: status as unknown as Json,
        status: 'processed',
        processed_at: new Date().toISOString(),
      })

      await services.whatsapp.updateDeliveryStatus(status.waMessageId, status.status)
    }

    for (const message of inbound) {
      const idempotencyKey = `wa-inbound:${message.waMessageId}`
      const existing = await services.integration.findWebhookDelivery('whatsapp', idempotencyKey)

      if (existing) {
        continue
      }

      const tenantId = await services.whatsapp.resolveTenantByPhoneNumberId(message.phoneNumberId)
      if (!tenantId) {
        await services.integration.createWebhookDelivery({
          source: 'whatsapp',
          idempotency_key: idempotencyKey,
          payload: message as unknown as Json,
          status: 'failed',
          error_message: 'tenant_not_found',
        })
        continue
      }

      const freelancer = await services.talent.findByPhone(tenantId, message.phone)
      if (!freelancer) {
        await services.integration.createWebhookDelivery({
          tenant_id: tenantId,
          source: 'whatsapp',
          idempotency_key: idempotencyKey,
          payload: message as unknown as Json,
          status: 'failed',
          error_message: 'freelancer_not_found',
        })

        await dispatchToN8n(
          buildN8nEnvelope({
            event: 'whatsapp.unrecognized',
            tenantId,
            idempotencyKey,
            data: { phone: message.phone, body: message.body },
          })
        )
        continue
      }

      const result = await services.whatsapp.processInboundMessage({
        message,
        tenantId,
        freelancer: { id: freelancer.id, full_name: freelancer.full_name },
        services,
      })

      await services.integration.createWebhookDelivery({
        tenant_id: tenantId,
        source: 'whatsapp',
        idempotency_key: idempotencyKey,
        event_type: 'inbound_message',
        payload: { message, result } as unknown as Json,
        status: 'processed',
        processed_at: new Date().toISOString(),
      })

      const n8nPayload = services.whatsapp.buildN8nPayload(
        result,
        { id: freelancer.id, full_name: freelancer.full_name },
        message
      )

      if (n8nPayload) {
        await dispatchToN8n(
          buildN8nEnvelope({
            event: n8nPayload.event,
            tenantId,
            idempotencyKey: n8nPayload.idempotencyKey,
            data: n8nPayload.data,
          })
        )
      }
    }

    instrumentApiRequest({
      method: 'POST',
      path,
      status: 200,
      durationMs: Date.now() - startedAt,
      context: {
        correlationId: traceIds.traceId,
        requestId: traceIds.spanId,
        traceId: traceIds.traceId,
        spanId: traceIds.spanId,
      },
    })

    return NextResponse.json({ status: 'received' })
  } catch (err) {
    const response = handleApiError(err)
    instrumentApiRequest({
      method: 'POST',
      path,
      status: response.status,
      durationMs: Date.now() - startedAt,
      context: {
        correlationId: traceIds.traceId,
        requestId: traceIds.spanId,
        traceId: traceIds.traceId,
        spanId: traceIds.spanId,
      },
      errorCode: err instanceof AppError ? err.code : undefined,
    })
    return response
  }
}
