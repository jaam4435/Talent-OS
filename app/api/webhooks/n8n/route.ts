import { NextResponse } from 'next/server'
import { verifySignature } from '@/lib/integrations/encryption'
import { requireWebhookSecretInProduction } from '@/lib/integrations/system-auth'
import { logEvent } from '@/lib/utils/logger'
import { createAdminServices } from '@/lib/services/factory'

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-webhook-signature')
  const secret = process.env.N8N_WEBHOOK_SECRET ?? ''

  if (!secret && requireWebhookSecretInProduction()) {
    logEvent('webhook.n8n', 'Webhook secret missing in production', undefined, 'error')
    return NextResponse.json({ error: 'Webhook verification is not configured' }, { status: 503 })
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  if (secret && !verifySignature(body, secret, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const idempotencyKey =
    request.headers.get('x-idempotency-key') ?? `n8n:${String(body.event)}:${Date.now()}`

  const services = await createAdminServices()
  const result = await services.integration.processN8nWebhook(body, idempotencyKey)

  if (result.duplicate) {
    return NextResponse.json({ status: 'duplicate' })
  }

  return NextResponse.json({ status: 'processed' })
}
