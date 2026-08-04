import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getNavGroupsForRole } from '@/modules/core/components/navigation/nav-config'
import { createInviteSchema } from '@/modules/organization/validation'

const ROOT = process.cwd()

function read(path: string) {
  return readFileSync(join(ROOT, path), 'utf8')
}

describe('Organization UI routes', () => {
  const pages = [
    'app/(dashboard)/organization/page.tsx',
    'app/(dashboard)/organization/members/page.tsx',
    'app/(dashboard)/organization/invitations/page.tsx',
    'app/(dashboard)/organization/departments/page.tsx',
    'app/(dashboard)/organization/teams/page.tsx',
    'app/(dashboard)/organization/audit/page.tsx',
    'app/(dashboard)/organization/layout.tsx',
  ]

  it.each(pages)('%s exists', (pagePath) => {
    expect(read(pagePath)).toContain('requireAdmin')
  })

  it('redirects legacy team settings to organization members', () => {
    expect(read('app/(dashboard)/settings/team/page.tsx')).toContain("redirect('/organization/members')")
  })
})

describe('Organization navigation', () => {
  it('includes organization link for admins', () => {
    const labels = getNavGroupsForRole('admin')
      .flatMap((group) => group.items)
      .map((item) => item.label)
    expect(labels).toContain('Organization')
    expect(labels).toContain('Settings')
  })
})

describe('Organization API client', () => {
  it('uses REST endpoints for mutations', () => {
    const src = read('lib/api/organization-api.ts')
    expect(src).toContain('/api/organization/invitations')
    expect(src).toContain('/api/organization/members/')
    expect(src).toContain('/api/organization/branding')
  })

  it('uses organization hook with user-friendly errors', () => {
    const src = read('modules/organization/hooks/use-organization-api.ts')
    expect(src).toContain('getUserMessageForApiError')
    expect(src).toContain('router.refresh()')
  })
})

describe('Organization invite validation', () => {
  it('accepts valid invite payload', () => {
    const result = createInviteSchema.safeParse({
      email: 'manager@example.com',
      role: 'talent_manager',
    })
    expect(result.success).toBe(true)
  })
})
