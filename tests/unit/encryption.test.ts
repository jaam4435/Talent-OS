import { describe, expect, it } from 'vitest'
import { signPayload, verifyMetaSignature, verifySignature } from '@/lib/integrations/encryption'

describe('verifySignature', () => {
  it('accepts valid HMAC signatures', () => {
    const payload = { event: 'test.event' }
    const secret = 'test-secret-key'
    const signature = `sha256=${signPayload(payload, secret)}`
    expect(verifySignature(payload, secret, signature)).toBe(true)
  })

  it('rejects invalid signatures', () => {
    expect(verifySignature({ a: 1 }, 'secret', 'sha256=deadbeef')).toBe(false)
  })

  it('rejects missing signature', () => {
    expect(verifySignature({ a: 1 }, 'secret', null)).toBe(false)
  })

  it('rejects empty secret', () => {
    expect(verifySignature({ a: 1 }, '', 'sha256=abc')).toBe(false)
  })
})

describe('verifyMetaSignature', () => {
  it('validates Meta webhook signatures on raw body', () => {
    const secret = 'meta-secret'
    const rawBody = '{"entry":[]}'
    const crypto = require('crypto')
    const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
    expect(verifyMetaSignature(rawBody, secret, `sha256=${digest}`)).toBe(true)
  })

  it('rejects tampered body', () => {
    expect(verifyMetaSignature('{"entry":[]}', 'meta-secret', 'sha256=bad')).toBe(false)
  })
})
