import { createHash } from 'crypto'
import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { verifySignature } from '@/lib/integrations/encryption'
import { assertProductionSecrets, isProduction, requireWebhookSecret } from '@/lib/env'
import { createAdminServices } from '@/lib/services/factory'

function stableDevIdempotencyKey(payload: unknown): string {
  const hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16)
  return `n8n:dev:${hash}`
}

export const POST = withApiHandler(
  { auth: 'none', rateLimit: 'webhook', legacyEnvelope: true },
  async ({ request, body }) => {
    assertProductionSecrets()

    const signature = request.headers.get('x-webhook-signature')
    const payload = body as { event?: string }
    const headerKey = request.headers.get('x-idempotency-key')
    const secret = requireWebhookSecret('N8N_WEBHOOK_SECRET', process.env.N8N_WEBHOOK_SECRET)

    if (isProduction() && !headerKey) {
      throw new AppError('VALIDATION_ERROR', 'x-idempotency-key header is required', 400)
    }

    const idempotencyKey =
      headerKey ??
      (payload.event
        ? stableDevIdempotencyKey(payload)
        : stableDevIdempotencyKey({ unknown: true }))

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
