import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getNavGroupsForRole } from '@/modules/core/components/navigation/nav-config'

const ROOT = process.cwd()

function read(path: string) {
  return readFileSync(join(ROOT, path), 'utf8')
}

describe('AI and knowledge UI routes', () => {
  const pages = [
    'app/(dashboard)/ai/layout.tsx',
    'app/(dashboard)/ai/agents/page.tsx',
    'app/(dashboard)/ai/agents/[agentId]/page.tsx',
    'app/(dashboard)/knowledge/layout.tsx',
    'app/(dashboard)/knowledge/page.tsx',
    'app/(dashboard)/knowledge/[id]/page.tsx',
    'app/(dashboard)/settings/agents/page.tsx',
  ]

  it.each(pages)('%s uses requireManager or requireAdmin guard', (pagePath) => {
    const src = read(pagePath)
    if (pagePath.includes('/knowledge/') && !pagePath.includes('layout')) {
      expect(read('app/(dashboard)/knowledge/layout.tsx')).toContain('requireManager')
      return
    }
    expect(src.includes('requireManager') || src.includes('requireAdmin')).toBe(true)
  })
})

describe('AI API clients', () => {
  it('agents API targets REST endpoints', () => {
    const src = read('lib/api/agents-api.ts')
    expect(src).toContain('/api/agents')
    expect(src).toContain('/run')
  })

  it('knowledge API targets REST endpoints', () => {
    const src = read('lib/api/knowledge-api.ts')
    expect(src).toContain('/api/knowledge/entries')
    expect(src).toContain('/api/knowledge/search')
  })

  it('ai match panel uses REST client', () => {
    const src = read('components/opportunities/ai-match-panel.tsx')
    expect(src).toContain('aiApi.runTalentMatch')
    expect(src).not.toContain("from '@/app/actions/ai'")
  })
})

describe('Operations navigation', () => {
  it('includes AI agents and knowledge links for managers', () => {
    const labels = getNavGroupsForRole('talent_manager')
      .flatMap((group) => group.items)
      .map((item) => item.label)
    expect(labels).toContain('AI Agents')
    expect(labels).toContain('Knowledge')
  })
})

describe('AI disabled banner', () => {
  it('renders feature flag messaging', () => {
    const src = read('components/ai/ai-feature-banner.tsx')
    expect(src).toContain('AI matching is disabled')
    expect(src).toContain('getFeatureFlags')
  })
})
