import { afterEach, describe, expect, it, vi } from 'vitest'
import { assertProductionSecrets, isProduction, requireWebhookSecret } from '@/lib/env'

describe('isProduction', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('NODE_ENV', 'test')
  })

  it('detects NODE_ENV production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(isProduction()).toBe(true)
  })

  it('detects VERCEL_ENV production', () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    expect(isProduction()).toBe(true)
  })
})

describe('requireWebhookSecret', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('NODE_ENV', 'test')
  })

  it('returns secret when set', () => {
    expect(requireWebhookSecret('TEST', 'abc')).toBe('abc')
  })

  it('allows missing secret in non-production', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(requireWebhookSecret('TEST', undefined)).toBe('')
  })

  it('throws when missing in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(() => requireWebhookSecret('TEST', undefined)).toThrow(/TEST/)
  })
})

describe('assertProductionSecrets', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('NODE_ENV', 'test')
  })

  it('skips validation outside production', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(() => assertProductionSecrets()).not.toThrow()
  })

  it('throws when production secrets are incomplete', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(() => assertProductionSecrets()).toThrow(/Production secrets/)
  })

  it('passes when all production secrets are set', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('CRON_SECRET', 'cron-secret-min-16-ch')
    vi.stubEnv('ENCRYPTION_KEY', 'a'.repeat(64))
    vi.stubEnv('WHATSAPP_APP_SECRET', 'whatsapp-secret')
    vi.stubEnv('N8N_WEBHOOK_SECRET', 'n8n-secret')
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example.upstash.io')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token-secret')
    expect(() => assertProductionSecrets()).not.toThrow()
  })
})
