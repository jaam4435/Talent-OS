import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { verifySignature } from '@/lib/integrations/encryption'
import { createAdminServices } from '@/lib/services/factory'

export const POST = withApiHandler(
  { auth: 'none', rateLimit: 'webhook', legacyEnvelope: true },
  async ({ request, body }) => {
    const signature = request.headers.get('x-webhook-signature')
    const payload = body as { event?: string }
    const idempotencyKey =
      request.headers.get('x-idempotency-key') ?? `n8n:${payload.event}:${Date.now()}`
    const secret = process.env.N8N_WEBHOOK_SECRET ?? ''

    if (secret && !verifySignature(payload, secret, signature)) {
      throw new AppError('WEBHOOK_INVALID_SIGNATURE', 'Invalid signature', 401)
    }

    const services = await createAdminServices()
    const result = await services.integration.processN8nWebhook(payload, idempotencyKey)

    if (result.duplicate) {
      return { status: 'duplicate' }
    }

    return { status: 'processed' }
  }
)
