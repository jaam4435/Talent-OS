import { describe, expect, it } from 'vitest'
import {
  isPublicOrSystemRoute,
  isSystemRoute,
  matchesRoutePrefix,
  SYSTEM_ROUTES,
} from '@/modules/core/utils/constants'

describe('SYSTEM_ROUTES', () => {
  it('includes cron, internal, and health paths', () => {
    expect(SYSTEM_ROUTES).toContain('/api/cron')
    expect(SYSTEM_ROUTES).toContain('/api/internal')
    expect(SYSTEM_ROUTES).toContain('/api/health')
  })
})

describe('isSystemRoute', () => {
  it('matches cron routes', () => {
    expect(isSystemRoute('/api/cron/dispatch-events')).toBe(true)
    expect(isSystemRoute('/api/cron/process-workflow-jobs')).toBe(true)
  })

  it('matches internal routes', () => {
    expect(isSystemRoute('/api/internal/ai/execute')).toBe(true)
  })

  it('matches health route', () => {
    expect(isSystemRoute('/api/health')).toBe(true)
  })

  it('does not match authenticated app routes', () => {
    expect(isSystemRoute('/dashboard')).toBe(false)
    expect(isSystemRoute('/api/webhooks/whatsapp')).toBe(false)
  })
})

describe('isPublicOrSystemRoute', () => {
  it('allows login without session', () => {
    expect(isPublicOrSystemRoute('/login')).toBe(true)
  })

  it('allows root without session', () => {
    expect(isPublicOrSystemRoute('/')).toBe(true)
  })

  it('allows cron without session', () => {
    expect(isPublicOrSystemRoute('/api/cron/dispatch-events')).toBe(true)
  })

  it('blocks dashboard without session bypass', () => {
    expect(isPublicOrSystemRoute('/dashboard')).toBe(false)
  })
})

describe('matchesRoutePrefix', () => {
  it('matches exact and nested paths', () => {
    expect(matchesRoutePrefix('/settings', ['/settings'])).toBe(true)
    expect(matchesRoutePrefix('/settings/team', ['/settings'])).toBe(true)
    expect(matchesRoutePrefix('/setting', ['/settings'])).toBe(false)
  })
})
