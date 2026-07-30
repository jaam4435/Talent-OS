import { logEvent } from '@/lib/utils/logger'

export type SystemAuthScope = 'cron' | 'internal'

function readSecret(scope: SystemAuthScope): string | undefined {
  if (scope === 'internal') {
    return process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET
  }
  return process.env.CRON_SECRET
}

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice('Bearer '.length)
}

/** Validates bearer auth for cron and internal system routes. */
export function validateSystemAuth(
  authHeader: string | null,
  scope: SystemAuthScope
): { ok: true } | { ok: false; status: 401 | 503; error: string } {
  const secret = readSecret(scope)
  if (!secret) {
    logEvent('system-auth', 'Missing system secret', { scope }, 'error')
    return { ok: false, status: 503, error: 'System authentication is not configured' }
  }

  const token = extractBearerToken(authHeader)
  if (!token || token !== secret) {
    logEvent('system-auth', 'Invalid system auth token', { scope }, 'warn')
    return { ok: false, status: 401, error: 'Unauthorized' }
  }

  return { ok: true }
}

/** Returns true when webhook signature verification must be enforced. */
export function requireWebhookSecretInProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}
