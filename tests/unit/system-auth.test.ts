import { afterEach, describe, expect, it, vi } from 'vitest'
import { validateSystemAuth, requireWebhookSecretInProduction } from '@/lib/integrations/system-auth'

describe('validateSystemAuth', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('accepts valid cron bearer token', () => {
    vi.stubEnv('CRON_SECRET', 'cron-test-secret')
    const result = validateSystemAuth('Bearer cron-test-secret', 'cron')
    expect(result).toEqual({ ok: true })
  })

  it('rejects invalid cron bearer token', () => {
    vi.stubEnv('CRON_SECRET', 'cron-test-secret')
    const result = validateSystemAuth('Bearer wrong-secret', 'cron')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(401)
      expect(result.error).toBe('Unauthorized')
    }
  })

  it('returns 503 when cron secret is missing', () => {
    vi.stubEnv('CRON_SECRET', '')
    const result = validateSystemAuth('Bearer anything', 'cron')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(503)
    }
  })

  it('uses INTERNAL_API_SECRET for internal routes', () => {
    vi.stubEnv('CRON_SECRET', 'cron-secret')
    vi.stubEnv('INTERNAL_API_SECRET', 'internal-secret')
    expect(validateSystemAuth('Bearer internal-secret', 'internal')).toEqual({ ok: true })
    expect(validateSystemAuth('Bearer cron-secret', 'internal').ok).toBe(false)
  })

  it('falls back to CRON_SECRET for internal routes when INTERNAL_API_SECRET is unset', () => {
    vi.stubEnv('CRON_SECRET', 'shared-secret')
    vi.stubEnv('INTERNAL_API_SECRET', '')
    expect(validateSystemAuth('Bearer shared-secret', 'internal')).toEqual({ ok: true })
  })
})

describe('requireWebhookSecretInProduction', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('requires secrets in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(requireWebhookSecretInProduction()).toBe(true)
  })

  it('does not require secrets in development', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(requireWebhookSecretInProduction()).toBe(false)
  })
})
