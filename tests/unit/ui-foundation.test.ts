import { describe, expect, it } from 'vitest'
import {
  getActiveNavGroupIds,
  getNavGroupsForRole,
  isNavItemActive,
  NAV_GROUPS,
} from '@/modules/core/components/navigation/nav-config'

describe('nav-config', () => {
  it('defines grouped navigation with existing routes only', () => {
    const hrefs = NAV_GROUPS.flatMap((group) => group.items.map((item) => item.href))
    expect(hrefs).toContain('/dashboard')
    expect(hrefs).toContain('/talent')
    expect(hrefs).toContain('/opportunities')
    expect(hrefs).not.toContain('/crm/pipeline')
  })

  it('filters items by role for managers', () => {
    const groups = getNavGroupsForRole('talent_manager')
    const labels = groups.flatMap((group) => group.items.map((item) => item.label))
    expect(labels).toContain('Talent roster')
    expect(labels).toContain('Analytics')
    expect(labels).not.toContain('Settings')
  })

  it('filters items by role for freelancers', () => {
    const groups = getNavGroupsForRole('freelancer')
    const labels = groups.flatMap((group) => group.items.map((item) => item.label))
    expect(labels).toContain('My profile')
    expect(labels).not.toContain('Talent roster')
    expect(labels).not.toContain('Analytics')
  })

  it('detects active nav items including nested paths', () => {
    expect(isNavItemActive('/talent/abc', '/talent')).toBe(true)
    expect(isNavItemActive('/projects', '/talent')).toBe(false)
  })

  it('expands groups that contain the active route', () => {
    const active = getActiveNavGroupIds('/talent', 'admin')
    expect(active).toContain('supply')
  })
})

describe('UI foundation components', () => {
  it('defines shared table, filter, pagination, and breadcrumb modules', () => {
    const fs = require('node:fs') as typeof import('node:fs')
    const read = (path: string) => fs.readFileSync(path, 'utf8')
    expect(read('modules/core/components/shared/data-table.tsx')).toContain('export function DataTable')
    expect(read('modules/core/components/shared/filter-bar.tsx')).toContain('export function FilterBar')
    expect(read('modules/core/components/shared/pagination.tsx')).toContain('export function Pagination')
    expect(read('modules/core/components/navigation/breadcrumb-nav.tsx')).toContain('export function BreadcrumbNav')
  })

  it('maps API error codes to user-friendly messages', async () => {
    const { getUserMessageForErrorCode } = await import('@/lib/api/user-messages')
    expect(getUserMessageForErrorCode('FORBIDDEN')).toContain('permission')
    expect(getUserMessageForErrorCode('RATE_LIMITED')).toContain('Too many requests')
  })

  it('extends TalentOsClient with listTalent and formatError', async () => {
    const { createTalentOsClient } = await import('@/lib/api/client')
    const client = createTalentOsClient()
    expect(typeof client.listTalent).toBe('function')
    expect(typeof client.formatError).toBe('function')
  })
})

describe('Dashboard route boundaries', () => {
  it('provides loading and error routes for dashboard shell', async () => {
    const fs = await import('node:fs/promises')
    await expect(fs.access('app/(dashboard)/loading.tsx')).resolves.toBeUndefined()
    await expect(fs.access('app/(dashboard)/error.tsx')).resolves.toBeUndefined()
  })
})
