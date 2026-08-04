import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

function read(path: string) {
  return readFileSync(join(ROOT, path), 'utf8')
}

describe('Assignment module migration', () => {
  it('creates assignment tables and RLS', () => {
    const sql = read('supabase/migrations/027_assignment_module.sql')
    expect(sql).toContain('CREATE TABLE assignment_allocations')
    expect(sql).toContain('CREATE TABLE assignment_capacity')
    expect(sql).toContain('CREATE TABLE assignment_schedules')
    expect(sql).toContain('CREATE TABLE assignment_requirements')
    expect(sql).toContain('CREATE TABLE assignment_conflicts')
    expect(sql).toContain('CREATE TABLE assignment_history')
    expect(sql).toContain('CREATE TABLE assignment_audit_logs')
    expect(sql).toContain('detect_assignment_conflicts')
    expect(sql).toContain('suggest_assignment_candidates')
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY')
  })
})

describe('Assignment API routes', () => {
  const routes = [
    'app/api/assignments/route.ts',
    'app/api/assignments/[id]/route.ts',
    'app/api/assignments/conflicts/check/route.ts',
    'app/api/assignments/conflicts/route.ts',
    'app/api/assignments/suggest/route.ts',
    'app/api/assignments/capacity/route.ts',
    'app/api/assignments/[id]/schedules/route.ts',
    'app/api/assignments/[id]/requirements/route.ts',
    'app/api/assignments/[id]/history/route.ts',
    'app/api/assignments/audit-logs/route.ts',
  ]

  it.each(routes)('%s uses withApiHandler', (routePath) => {
    expect(read(routePath)).toContain('withApiHandler')
  })

  it('list route requires assignment:read', () => {
    expect(read('app/api/assignments/route.ts')).toContain("'assignment:read'")
  })

  it('create route requires assignment:manage', () => {
    expect(read('app/api/assignments/route.ts')).toContain("'assignment:manage'")
  })
})

describe('Backward compatibility', () => {
  it('preserves existing AssignmentService', () => {
    expect(read('lib/services/assignment.service.ts')).toContain('class AssignmentService')
  })
})
