import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

function read(path: string) {
  return readFileSync(join(ROOT, path), 'utf8')
}

describe('Project module migration', () => {
  it('creates project tables and RLS', () => {
    const sql = read('supabase/migrations/026_project_module.sql')
    expect(sql).toContain('CREATE TABLE project_tasks')
    expect(sql).toContain('CREATE TABLE project_deliverables')
    expect(sql).toContain('CREATE TABLE project_assets')
    expect(sql).toContain('CREATE TABLE project_comments')
    expect(sql).toContain('CREATE TABLE project_dependencies')
    expect(sql).toContain('CREATE TABLE project_templates')
    expect(sql).toContain('CREATE TABLE project_timeline_events')
    expect(sql).toContain('CREATE TABLE project_audit_logs')
    expect(sql).toContain('compute_project_health')
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY')
  })
})

describe('Project API routes', () => {
  const routes = [
    'app/api/projects/route.ts',
    'app/api/projects/[id]/route.ts',
    'app/api/projects/[id]/status/route.ts',
    'app/api/projects/[id]/health/route.ts',
    'app/api/projects/[id]/timeline/route.ts',
    'app/api/projects/[id]/milestones/route.ts',
    'app/api/projects/[id]/tasks/route.ts',
    'app/api/projects/[id]/deliverables/route.ts',
    'app/api/projects/[id]/assets/route.ts',
    'app/api/projects/[id]/comments/route.ts',
    'app/api/projects/[id]/dependencies/route.ts',
    'app/api/projects/templates/route.ts',
    'app/api/projects/templates/[id]/apply/route.ts',
    'app/api/projects/audit-logs/route.ts',
  ]

  it.each(routes)('%s uses withApiHandler', (routePath) => {
    expect(read(routePath)).toContain('withApiHandler')
  })

  it('list route requires project:read', () => {
    expect(read('app/api/projects/route.ts')).toContain("'project:read'")
  })

  it('status route requires project:manage', () => {
    expect(read('app/api/projects/[id]/status/route.ts')).toContain("'project:manage'")
  })

  it('templates route requires project:templates:manage', () => {
    expect(read('app/api/projects/templates/route.ts')).toContain("'project:templates:manage'")
  })
})

describe('Project AI-ready descriptors', () => {
  it('exports entity context map', () => {
    expect(read('modules/project/types.ts')).toContain('PROJECT_AI_ENTITIES')
  })
})

describe('Backward compatibility', () => {
  it('preserves existing ProjectService', () => {
    expect(read('lib/services/project.service.ts')).toContain('class ProjectService')
  })

  it('preserves status transition maps', () => {
    expect(read('lib/projects/types.ts')).toContain('MANAGER_STATUS_TRANSITIONS')
  })
})
