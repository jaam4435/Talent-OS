import { NextResponse } from 'next/server'
import { verifyMetaSignature } from '@/lib/integrations/encryption'
import { parseMetaWebhook } from '@/lib/whatsapp/parser'
import { buildN8nEnvelope, dispatchToN8n } from '@/lib/integrations/n8n'
import { createAdminServices } from '@/lib/services/factory'
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
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')
  const appSecret = process.env.WHATSAPP_APP_SECRET ?? ''

  if (appSecret && !verifyMetaSignature(rawBody, appSecret, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
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
      return NextResponse.json({ status: 'duplicate' })
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

  return NextResponse.json({ status: 'received' })
}
