import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { rankSearchResults, scoreLabelMatch } from '@/modules/core/utils/search-ranking'
import type { SearchResult } from '@/modules/core/types/search'

const ROOT = process.cwd()

function read(path: string) {
  return readFileSync(join(ROOT, path), 'utf8')
}

describe('Search ranking', () => {
  it('scores exact matches highest', () => {
    expect(scoreLabelMatch('Acme Corp', 'acme corp')).toBe(100)
    expect(scoreLabelMatch('Acme Corporation', 'acme')).toBe(80)
    expect(scoreLabelMatch('Globex Acme', 'acme')).toBe(50)
    expect(scoreLabelMatch('Globex', 'acme')).toBe(0)
  })

  it('ranks results by match quality', () => {
    const results: SearchResult[] = [
      {
        id: '1',
        type: 'company',
        title: 'Globex Acme',
        subtitle: null,
        href: '/crm/companies/1',
        score: 0,
      },
      {
        id: '2',
        type: 'company',
        title: 'Acme',
        subtitle: null,
        href: '/crm/companies/2',
        score: 0,
      },
    ]

    const ranked = rankSearchResults(results, 'Acme')
    expect(ranked[0]?.id).toBe('2')
    expect(ranked[1]?.id).toBe('1')
  })
})

describe('Search API route', () => {
  it('uses tenant auth and search rate limit', () => {
    const src = read('app/api/search/route.ts')
    expect(src).toContain("auth: 'tenant'")
    expect(src).toContain("rateLimit: 'search'")
    expect(src).toContain('services.search.search')
  })

  it('search service queries four entity types for managers', () => {
    const src = read('lib/services/search.service.ts')
    expect(src).toContain('searchTalent')
    expect(src).toContain('searchProjects')
    expect(src).toContain('searchCompanies')
    expect(src).toContain('searchDeals')
    expect(src).toContain('SEARCH_TIMEOUT_MS')
  })
})

describe('Command palette', () => {
  it('binds Cmd+K shortcut and search API', () => {
    const src = read('modules/core/components/navigation/command-palette.tsx')
    expect(src).toContain("event.key.toLowerCase() === 'k'")
    expect(src).toContain('/api/search')
    expect(src).toContain('talentos:recent-search')
  })
})

describe('Mobile navigation', () => {
  it('renders five destinations for managers', () => {
    const src = read('modules/core/components/layout/mobile-nav.tsx')
    expect(src).toContain('grid-cols-5')
    expect(src).toContain('/crm/pipeline')
    expect(src).toContain('md:hidden')
  })

  it('dashboard layout includes mobile nav and bottom padding', () => {
    const src = read('app/(dashboard)/layout.tsx')
    expect(src).toContain('MobileNav')
    expect(src).toContain('pb-20')
    expect(src).toContain('hidden md:flex')
  })
})

describe('Optimistic CRM pipeline', () => {
  it('reverts board state on API failure', () => {
    const src = read('modules/crm/components/pipeline-board.tsx')
    expect(src).toContain('moveDealInBoard')
    expect(src).toContain('setLocalBoard(previous)')
    expect(src).toContain('getUserMessageForApiError')
  })
})

describe('Observability settings UI', () => {
  it('requires admin and loads observability APIs', () => {
    expect(read('app/(dashboard)/settings/observability/page.tsx')).toContain('requireAdmin')
    const panel = read('modules/core/components/observability/observability-dashboard.tsx')
    expect(panel).toContain('/api/observability/dashboard')
    expect(panel).toContain('/api/observability/logs')
    expect(panel).toContain('/api/observability/traces/')
  })
})

describe('Header user menu', () => {
  it('includes profile link and command palette', () => {
    const src = read('modules/core/components/layout/header.tsx')
    expect(src).toContain('CommandPalette')
    expect(src).toContain('href="/profile"')
    expect(src).toContain('Sign out')
  })
})

describe('Observability API smoke', () => {
  const routes = [
    'app/api/observability/dashboard/route.ts',
    'app/api/observability/logs/route.ts',
    'app/api/observability/alerts/route.ts',
    'app/api/observability/traces/[correlationId]/route.ts',
  ]

  it.each(routes)('%s uses manager auth', (routePath) => {
    expect(read(routePath)).toContain("auth: 'manager'")
  })
})
