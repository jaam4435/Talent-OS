import { NextResponse } from 'next/server'
import { createAdminClient } from '@/modules/core/utils/supabase/admin'
import { verifyMetaSignature } from '@/lib/integrations/encryption'
import {
  parseMetaWebhook,
  processInboundQuickReply,
  resolveTenantByPhoneNumberId,
  findFreelancerByPhone,
  updateDeliveryStatus,
} from '@/lib/integrations/whatsapp'
import { buildN8nEnvelope, dispatchToN8n } from '@/lib/integrations/n8n'

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
  const supabase = createAdminClient()

  for (const status of statuses) {
    const idempotencyKey = `wa-status:${status.waMessageId}:${status.status}`
    const { data: existing } = await supabase
      .from('webhook_deliveries')
      .select('id')
      .eq('source', 'whatsapp')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (existing) continue

    await supabase.from('webhook_deliveries').insert({
      source: 'whatsapp',
      idempotency_key: idempotencyKey,
      event_type: 'status_update',
      payload: status,
      status: 'processed',
      processed_at: new Date().toISOString(),
    })

    await updateDeliveryStatus(status.waMessageId, status.status)
  }

  for (const message of inbound) {
    const idempotencyKey = `wa-inbound:${message.waMessageId}`
    const { data: existing } = await supabase
      .from('webhook_deliveries')
      .select('id')
      .eq('source', 'whatsapp')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ status: 'duplicate' })
    }

    const tenantId = await resolveTenantByPhoneNumberId(message.phoneNumberId)
    if (!tenantId) {
      await supabase.from('webhook_deliveries').insert({
        source: 'whatsapp',
        idempotency_key: idempotencyKey,
        payload: message,
        status: 'failed',
        error_message: 'tenant_not_found',
      })
      continue
    }

    const freelancer = await findFreelancerByPhone(tenantId, message.phone)
    if (!freelancer) {
      await supabase.from('webhook_deliveries').insert({
        tenant_id: tenantId,
        source: 'whatsapp',
        idempotency_key: idempotencyKey,
        payload: message,
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

    const result = await processInboundQuickReply({
      tenantId,
      freelancerId: freelancer.id,
      freelancerName: freelancer.full_name,
      phone: message.phone,
      body: message.body,
      waMessageId: message.waMessageId,
    })

    await supabase.from('webhook_deliveries').insert({
      tenant_id: tenantId,
      source: 'whatsapp',
      idempotency_key: idempotencyKey,
      event_type: 'inbound_message',
      payload: { message, result },
      status: 'processed',
      processed_at: new Date().toISOString(),
    })

    if (result.handled) {
      await dispatchToN8n(
        buildN8nEnvelope({
          event: 'whatsapp.response_processed',
          tenantId,
          idempotencyKey: `wa-response:${result.recipientId}`,
          data: {
            freelancer_id: freelancer.id,
            freelancer_name: result.freelancerName,
            response: result.response,
            opportunity_id: result.opportunityId,
            recipient_id: result.recipientId,
            phone: message.phone,
          },
        })
      )
    } else {
      await dispatchToN8n(
        buildN8nEnvelope({
          event: 'whatsapp.unrecognized',
          tenantId,
          idempotencyKey: `wa-unrecognized:${message.waMessageId}`,
          data: {
            freelancer_id: freelancer.id,
            phone: message.phone,
            body: message.body,
            reason: result.reason,
          },
        })
      )
    }
  }

  return NextResponse.json({ status: 'received' })
}
