import { test, expect } from '@playwright/test'

test.describe('System health', () => {
  test('GET /api/health returns ok', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.service).toBe('talent-os')
  })

  test('GET /api/openapi serves OpenAPI spec', async ({ request }) => {
    const response = await request.get('/api/openapi')
    expect(response.ok()).toBeTruthy()
    const text = await response.text()
    expect(text).toContain('openapi:')
    expect(text).toContain('Talent OS API')
  })
})

test.describe('API authentication', () => {
  test('GET /api/analytics/dashboard returns 401 without session', async ({ request }) => {
    const response = await request.get('/api/analytics/dashboard')
    expect(response.status()).toBe(401)
    const body = await response.json()
    expect(body.error?.code).toBe('UNAUTHORIZED')
  })

  test('GET /api/cron/dispatch-events returns 401 without cron secret', async ({ request }) => {
    const response = await request.get('/api/cron/dispatch-events')
    expect(response.status()).toBe(401)
  })

  test('GET /api/observability/dashboard returns 401 without session', async ({ request }) => {
    const response = await request.get('/api/observability/dashboard')
    expect(response.status()).toBe(401)
  })

  test('GET /api/team/members returns 401 without session', async ({ request }) => {
    const response = await request.get('/api/team/members')
    expect(response.status()).toBe(401)
  })
})

test.describe('Webhooks', () => {
  test('WhatsApp verify rejects invalid token', async ({ request }) => {
    const response = await request.get(
      '/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=invalid&hub.challenge=test'
    )
    expect(response.status()).toBe(403)
  })

  test('n8n webhook rejects missing signature when secret configured', async ({ request }) => {
    const response = await request.post('/api/webhooks/n8n', {
      data: { event: 'test' },
      headers: { 'content-type': 'application/json' },
    })
    expect(response.status()).toBe(401)
    const body = await response.json()
    expect(body.error?.code).toBe('WEBHOOK_INVALID_SIGNATURE')
  })
})

test.describe('Talent search', () => {
  test('GET /api/talent/search returns 401 without session', async ({ request }) => {
    const response = await request.get('/api/talent/search')
    expect(response.status()).toBe(401)
  })
})

test.describe('AI endpoints', () => {
  test('POST /api/ai/match returns 401 without session', async ({ request }) => {
    const response = await request.post('/api/ai/match', {
      data: { opportunity_id: '00000000-0000-0000-0000-000000000001' },
    })
    expect(response.status()).toBe(401)
  })
})
