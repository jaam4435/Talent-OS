import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

function read(path: string) {
  return readFileSync(join(ROOT, path), 'utf8')
}

describe('Workflow engine module migration', () => {
  it('creates workflow module tables and RLS', () => {
    const sql = read('supabase/migrations/028_workflow_engine_module.sql')
    expect(sql).toContain('CREATE TABLE workflow_definitions')
    expect(sql).toContain('CREATE TABLE workflow_execution_history')
    expect(sql).toContain('CREATE TABLE workflow_compensations')
    expect(sql).toContain('CREATE TABLE workflow_audit_logs')
    expect(sql).toContain('get_workflow_module_summary')
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY')
  })
})

describe('Workflow API routes', () => {
  const routes = [
    'app/api/workflows/definitions/route.ts',
    'app/api/workflows/definitions/[id]/route.ts',
    'app/api/workflows/runs/route.ts',
    'app/api/workflows/runs/[id]/route.ts',
    'app/api/workflows/jobs/route.ts',
    'app/api/workflows/history/route.ts',
    'app/api/workflows/compensations/route.ts',
    'app/api/workflows/compensations/retry/route.ts',
    'app/api/workflows/retries/jobs/route.ts',
    'app/api/workflows/retries/events/route.ts',
    'app/api/workflows/trigger/route.ts',
    'app/api/workflows/observability/route.ts',
    'app/api/workflows/audit-logs/route.ts',
    'app/api/workflows/approvals/route.ts',
    'app/api/workflows/approvals/[id]/route.ts',
  ]

  it.each(routes)('%s uses withApiHandler', (routePath) => {
    expect(read(routePath)).toContain('withApiHandler')
  })

  it('list route requires workflow:read', () => {
    expect(read('app/api/workflows/runs/route.ts')).toContain("'workflow:read'")
  })

  it('trigger route requires workflow:manage', () => {
    expect(read('app/api/workflows/trigger/route.ts')).toContain("'workflow:manage'")
  })
})

describe('WORKFLOW_ENGINE.md', () => {
  it('exists in Architecture docs', () => {
    const doc = read('docs/Architecture/WORKFLOW_ENGINE.md')
    expect(doc).toContain('Lead Qualification')
    expect(doc).toContain('Project Closure')
    expect(doc).toContain('Compensation')
  })
})
