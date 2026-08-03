import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { anonymizeDisplayName, MARKETPLACE_PUBLIC_FIELDS } from '@/modules/talent/marketplace'
import { marketplaceListQuerySchema, marketplaceVisibilitySchema } from '@/modules/talent/validation'
import { PLATFORM_FLAG_KEYS } from '@/modules/platform/features/registry'

const ROOT = process.cwd()

function read(path: string) {
  return readFileSync(join(ROOT, path), 'utf8')
}

describe('Migration 037 — talent marketplace', () => {
  const sql = read('supabase/migrations/037_talent_marketplace.sql')

  it('adds marketplace eligibility columns on freelancers', () => {
    expect(sql).toContain('marketplace_visible')
    expect(sql).toContain('marketplace_published_at')
    expect(sql).toContain('idx_freelancers_marketplace_visible')
  })

  it('creates public read view without PII columns in SELECT list', () => {
    const selectBlock = sql.split('CREATE OR REPLACE VIEW talent_marketplace_profiles AS')[1]?.split('FROM freelancers')[0] ?? ''
    expect(sql).toContain('CREATE OR REPLACE VIEW talent_marketplace_profiles')
    expect(selectBlock).not.toMatch(/\bemail\b/)
    expect(selectBlock).not.toMatch(/\bphone\b/)
    expect(selectBlock).not.toMatch(/\btenant_id\b/)
    expect(sql).toMatch(/marketplace_visible = true/)
  })

  it('seeds marketplace_enabled platform flag default off', () => {
    expect(sql).toContain("'marketplace_enabled', false, NULL")
  })
})

describe('Platform marketplace flag', () => {
  it('registers marketplace_enabled key', () => {
    expect(PLATFORM_FLAG_KEYS.MARKETPLACE_ENABLED).toBe('marketplace_enabled')
  })

  it('guard returns 404 semantics for disabled marketplace', () => {
    const src = read('lib/platform/marketplace-guard.ts')
    expect(src).toContain("AppError('NOT_FOUND'")
    expect(src).toContain('notFound()')
    expect(src).toContain('PLATFORM_FLAG_KEYS.MARKETPLACE_ENABLED')
  })
})

describe('Marketplace anonymization', () => {
  it('reduces full names to first name and last initial', () => {
    expect(anonymizeDisplayName('Alex Morgan')).toBe('Alex M.')
    expect(anonymizeDisplayName('Sam')).toBe('Sam')
  })

  it('documents public field allowlist without PII keys', () => {
    const allowlist = MARKETPLACE_PUBLIC_FIELDS.join(',')
    expect(allowlist).toContain('displayName')
    expect(allowlist).not.toContain('email')
    expect(allowlist).not.toContain('phone')
    expect(allowlist).not.toContain('tenantId')
  })
})

describe('Marketplace API routes', () => {
  it('public marketplace route is unauthenticated read-only', () => {
    const src = read('app/api/talent/marketplace/route.ts')
    expect(src).toContain("auth: 'none'")
    expect(src).toContain('assertMarketplaceEnabled')
    expect(src).toContain('listMarketplaceProfiles')
    expect(src).toContain('export const POST = withApiHandler({ auth: \'none\'')
    expect(src).toContain("throw new AppError('NOT_FOUND'")
  })

  it('manager PATCH route controls marketplace visibility', () => {
    const src = read('app/api/talent/[id]/marketplace/route.ts')
    expect(src).toContain("auth: 'manager'")
    expect(src).toContain('talent:manage')
    expect(src).toContain('setMarketplaceVisibility')
  })
})

describe('Marketplace validation', () => {
  it('accepts list query pagination', () => {
    const parsed = marketplaceListQuerySchema.safeParse({ page: 1, limit: 20 })
    expect(parsed.success).toBe(true)
  })

  it('requires visible boolean for admin toggle', () => {
    expect(marketplaceVisibilitySchema.safeParse({ visible: true }).success).toBe(true)
    expect(marketplaceVisibilitySchema.safeParse({}).success).toBe(false)
  })
})

describe('Marketplace UI', () => {
  it('public page layout hides when feature disabled', () => {
    const src = read('app/(public)/marketplace/layout.tsx')
    expect(src).toContain('requireMarketplaceEnabled')
  })

  it('talent detail includes manager marketplace toggle', () => {
    const src = read('app/(dashboard)/talent/[id]/page.tsx')
    expect(src).toContain('MarketplaceVisibilityToggle')
    expect(src).toContain('getTalentModuleProfile')
  })

  it('toggle component calls marketplace PATCH endpoint', () => {
    const src = read('modules/talent/components/marketplace-visibility-toggle.tsx')
    expect(src).toContain('/api/talent/')
    expect(src).toContain('/marketplace')
  })
})

describe('Marketplace repository filters', () => {
  it('lists only visible non-deleted profiles', () => {
    const src = read('lib/repositories/talent.repository.ts')
    expect(src).toContain('listMarketplaceProfiles')
    expect(src).toContain(".eq('marketplace_visible', true)")
    expect(src).toContain(".is('deleted_at', null)")
  })
})
