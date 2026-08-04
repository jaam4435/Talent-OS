import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getNavGroupsForRole } from '@/modules/core/components/navigation/nav-config'
import { moveDealStageSchema } from '@/modules/crm/validation'

const ROOT = process.cwd()

function read(path: string) {
  return readFileSync(join(ROOT, path), 'utf8')
}

describe('CRM UI routes', () => {
  const pages = [
    'app/(dashboard)/crm/layout.tsx',
    'app/(dashboard)/crm/pipeline/page.tsx',
    'app/(dashboard)/crm/leads/page.tsx',
    'app/(dashboard)/crm/leads/new/page.tsx',
    'app/(dashboard)/crm/leads/[id]/page.tsx',
    'app/(dashboard)/crm/companies/page.tsx',
    'app/(dashboard)/crm/companies/[id]/page.tsx',
    'app/(dashboard)/crm/deals/[id]/page.tsx',
    'app/(dashboard)/crm/contracts/page.tsx',
  ]

  it.each(pages)('%s uses requireManager', (pagePath) => {
    expect(read(pagePath)).toContain('requireManager')
  })

  it('layout gates unauthorized users', () => {
    expect(read('app/(dashboard)/crm/layout.tsx')).toContain('notFound')
  })
})

describe('CRM navigation', () => {
  it('includes CRM links for managers', () => {
    const labels = getNavGroupsForRole('talent_manager')
      .flatMap((group) => group.items)
      .map((item) => item.label)
    expect(labels).toContain('Pipeline')
    expect(labels).toContain('Leads')
    expect(labels).toContain('Companies')
    expect(labels).toContain('Contracts')
  })

  it('hides CRM links from freelancers', () => {
    const labels = getNavGroupsForRole('freelancer')
      .flatMap((group) => group.items)
      .map((item) => item.label)
    expect(labels).not.toContain('Pipeline')
    expect(labels).not.toContain('Leads')
  })
})

describe('CRM API client', () => {
  it('uses REST endpoints for mutations', () => {
    const src = read('lib/api/crm-api.ts')
    expect(src).toContain('/api/crm/leads')
    expect(src).toContain('/api/crm/deals/')
    expect(src).toContain('/api/crm/leads/')
    expect(src).toContain('/convert')
  })

  it('uses CRM hook with user-friendly errors', () => {
    const src = read('modules/crm/hooks/use-crm.ts')
    expect(src).toContain('getUserMessageForApiError')
    expect(src).toContain('router.refresh()')
  })
})

describe('Pipeline stage transition validation', () => {
  it('requires a stage_id UUID', () => {
    const valid = moveDealStageSchema.safeParse({
      stage_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(valid.success).toBe(true)

    const invalid = moveDealStageSchema.safeParse({ stage_id: 'not-a-uuid' })
    expect(invalid.success).toBe(false)
  })
})

describe('Legacy companies action', () => {
  it('is marked deprecated', () => {
    expect(read('app/actions/companies.ts')).toContain('@deprecated')
  })
})
