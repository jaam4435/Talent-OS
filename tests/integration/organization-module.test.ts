import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

function read(path: string) {
  return readFileSync(join(ROOT, path), 'utf8')
}

describe('Organization module migration', () => {
  it('adds departments, teams, audit logs, and soft delete', () => {
    const sql = read('supabase/migrations/023_organization_module.sql')
    expect(sql).toContain('CREATE TABLE org_departments')
    expect(sql).toContain('CREATE TABLE org_teams')
    expect(sql).toContain('CREATE TABLE org_team_members')
    expect(sql).toContain('CREATE TABLE organization_audit_logs')
    expect(sql).toContain('deleted_at')
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY')
    expect(sql).toContain('org_audit_select')
  })

  it('filters soft-deleted tenant members in select policy', () => {
    const sql = read('supabase/migrations/023_organization_module.sql')
    expect(sql).toMatch(/tenant_members_select[\s\S]*deleted_at IS NULL/)
  })
})

describe('Organization API routes', () => {
  const routes = [
    'app/api/organization/route.ts',
    'app/api/organization/branding/route.ts',
    'app/api/organization/settings/route.ts',
    'app/api/organization/subscription/route.ts',
    'app/api/organization/permissions/route.ts',
    'app/api/organization/departments/route.ts',
    'app/api/organization/departments/[id]/route.ts',
    'app/api/organization/teams/route.ts',
    'app/api/organization/teams/[id]/route.ts',
    'app/api/organization/teams/[id]/members/route.ts',
    'app/api/organization/members/route.ts',
    'app/api/organization/members/[id]/route.ts',
    'app/api/organization/invitations/route.ts',
    'app/api/organization/invitations/[id]/route.ts',
    'app/api/organization/audit-logs/route.ts',
  ]

  it.each(routes)('%s uses withApiHandler', (routePath) => {
    const src = read(routePath)
    expect(src).toContain('withApiHandler')
  })

  it('member mutations require members:manage permission', () => {
    const src = read('app/api/organization/members/[id]/route.ts')
    expect(src).toContain("'members:manage'")
  })

  it('audit logs require org:audit:read permission', () => {
    const src = read('app/api/organization/audit-logs/route.ts')
    expect(src).toContain("'org:audit:read'")
  })
})

describe('Organization repositories tenant scoping', () => {
  it('organization repository filters deleted tenants', () => {
    const src = read('lib/repositories/organization.repository.ts')
    expect(src).toContain(".is('deleted_at', null)")
  })

  it('department repository scopes by tenant_id', () => {
    const src = read('lib/repositories/organization-department.repository.ts')
    expect(src).toContain("eq('tenant_id', tenantId)")
  })
})
