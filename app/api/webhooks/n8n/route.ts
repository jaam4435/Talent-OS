import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifySignature } from '@/lib/integrations/encryption'
import { updateDeliveryStatus } from '@/lib/integrations/whatsapp'

export async function POST(request: Request) {
  const rawBody = await request.text()
  const body = JSON.parse(rawBody)
  const signature = request.headers.get('x-webhook-signature')
  const idempotencyKey =
    request.headers.get('x-idempotency-key') ?? `n8n:${body.event}:${Date.now()}`
  const secret = process.env.N8N_WEBHOOK_SECRET ?? ''

  if (secret && !verifySignature(body, secret, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('webhook_deliveries')
    .select('id')
    .eq('source', 'n8n')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ status: 'duplicate' })
  }

  await supabase.from('webhook_deliveries').insert({
    tenant_id: body.tenant_id ?? null,
    source: 'n8n',
    idempotency_key: idempotencyKey,
    correlation_id: body.correlation_id ?? null,
    event_type: body.event,
    payload: body,
    status: 'received',
  })

  switch (body.event) {
    case 'whatsapp.send_completed': {
      const { wa_message_id, status, entity_id } = body.data ?? {}
      if (wa_message_id) {
        await updateDeliveryStatus(wa_message_id, status ?? 'sent')
      }
      if (entity_id && body.data?.whatsapp_sent_at) {
        await supabase
          .from('opportunity_recipients')
          .update({
            whatsapp_sent_at: body.data.whatsapp_sent_at,
            whatsapp_delivered: status === 'delivered',
          })
          .eq('id', entity_id)
      }
      break
    }
    case 'email.sent': {
      await supabase.from('email_logs').insert({
        tenant_id: body.tenant_id,
        to_email: body.data?.to_email,
        template_name: body.data?.template_name,
        subject: body.data?.subject,
        status: 'sent',
        provider_id: body.data?.provider_id,
        entity_type: body.data?.entity_type,
        entity_id: body.data?.entity_id,
      })
      break
    }
    case 'ai.match_completed': {
      const { ai_request_id, opportunity_id, match_count } = body.data ?? {}
      if (ai_request_id) {
        await supabase
          .from('ai_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            result: {
              match_count: match_count ?? 0,
              callback: true,
            },
          })
          .eq('id', ai_request_id)
      }
      if (body.data?.notification_user_id && opportunity_id) {
        await supabase.from('notifications').insert({
          tenant_id: body.tenant_id,
          user_id: body.data.notification_user_id,
          type: 'system',
          title: 'AI talent matches ready',
          body: body.data.message ?? 'AI match results are available.',
          data: { opportunity_id, kind: 'ai_match_completed' },
        })
      }
      break
    }
    default:
      break
  }

  await supabase
    .from('webhook_deliveries')
    .update({ status: 'processed', processed_at: new Date().toISOString() })
    .eq('source', 'n8n')
    .eq('idempotency_key', idempotencyKey)

  return NextResponse.json({ status: 'processed' })
}
