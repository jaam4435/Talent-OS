import { z } from 'zod'

/** True when running a production deployment (Node or Vercel). */
export function isProduction(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production'
  )
}

/** Resolve a webhook secret; fail closed in production when unset. */
export function requireWebhookSecret(envName: string, value: string | undefined): string {
  if (value && value.length > 0) return value
  if (isProduction()) {
    throw new Error(`Missing required environment variable: ${envName}`)
  }
  return ''
}

const productionSecretsSchema = z.object({
  CRON_SECRET: z.string().min(16),
  ENCRYPTION_KEY: z.string().length(64),
  WHATSAPP_APP_SECRET: z.string().min(8),
  N8N_WEBHOOK_SECRET: z.string().min(8),
})

/**
 * Validates production-critical secrets at runtime.
 * Call from webhook/cron handlers — not at module load (build-safe).
 */
export function assertProductionSecrets(): void {
  if (!isProduction()) return

  const result = productionSecretsSchema.safeParse({
    CRON_SECRET: process.env.CRON_SECRET,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET,
    N8N_WEBHOOK_SECRET: process.env.N8N_WEBHOOK_SECRET,
  })

  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join('.')).join(', ')
    throw new Error(`Production secrets validation failed: ${missing}`)
  }
}
