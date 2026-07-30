import { NextResponse } from 'next/server'
import { verifySignature } from '@/lib/integrations/encryption'
import { createAdminServices } from '@/lib/services/factory'

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

  const services = await createAdminServices()
  const result = await services.integration.processN8nWebhook(body, idempotencyKey)

  if (result.duplicate) {
    return NextResponse.json({ status: 'duplicate' })
  }

  return NextResponse.json({ status: 'processed' })
}
