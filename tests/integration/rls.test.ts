import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const MIGRATIONS_DIR = join(process.cwd(), 'supabase/migrations')

function readMigration(name: string): string {
  return readFileSync(join(MIGRATIONS_DIR, name), 'utf8')
}

describe('RLS migration integrity', () => {
  it('core tables have RLS enabled in 002', () => {
    const sql = readMigration('002_rls_policies.sql')
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY')
    expect(sql).toContain('CREATE POLICY')
    expect(sql).toContain('user_tenant_ids')
  })

  it('migration 020 revokes direct analytics view access', () => {
    const sql = readMigration('020_enterprise_hardening.sql')
    expect(sql).toContain('REVOKE SELECT ON v_dashboard_summary FROM authenticated')
    expect(sql).toContain('get_dashboard_summary')
    expect(sql).toContain('is_manager_of')
  })

  it('migration 020 grants emit_domain_event to authenticated', () => {
    const sql = readMigration('020_enterprise_hardening.sql')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.emit_domain_event')
    expect(sql).toContain('TO authenticated')
  })

  it('migration 021 restricts idempotency table to service role', () => {
    const sql = readMigration('021_api_idempotency.sql')
    expect(sql).toContain('api_idempotency_responses')
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY')
    expect(sql).toContain('REVOKE ALL ON api_idempotency_responses FROM authenticated')
    expect(sql).toContain('GRANT ALL ON api_idempotency_responses TO service_role')
  })

  it('shortlists has DELETE policy in 020', () => {
    const sql = readMigration('020_enterprise_hardening.sql')
    expect(sql).toContain('shortlists_delete')
    expect(sql).toContain('FOR DELETE')
  })
})

describe('Secure RPC tenant isolation', () => {
  it('get_dashboard_summary checks user_tenant_ids', () => {
    const sql = readMigration('020_enterprise_hardening.sql')
    expect(sql).toMatch(/get_dashboard_summary[\s\S]*user_tenant_ids/)
  })

  it('observability RPCs check is_manager_of', () => {
    const sql = readMigration('020_enterprise_hardening.sql')
    expect(sql).toContain('get_observability_workflow_health')
    expect(sql).toMatch(/get_observability_workflow_health[\s\S]*is_manager_of/)
  })
})

describe('Repository tenant scoping patterns', () => {
  it('dashboard repository uses secure RPC not direct view', () => {
    const src = readFileSync(join(process.cwd(), 'lib/repositories/dashboard.repository.ts'), 'utf8')
    expect(src).toContain("rpc('get_dashboard_summary'")
    expect(src).not.toContain("from('v_dashboard_summary')")
  })

  it('observability repository uses secure RPCs', () => {
    const src = readFileSync(join(process.cwd(), 'lib/repositories/observability.repository.ts'), 'utf8')
    expect(src).toContain('get_observability_workflow_health')
    expect(src).toContain('get_observability_queue_depth')
    expect(src).not.toContain('v_observability_workflow_health')
  })
})

describe('Analytics API authorization', () => {
  it('requires manager role and analytics permission', () => {
    const src = readFileSync(
      join(process.cwd(), 'app/api/analytics/dashboard/route.ts'),
      'utf8'
    )
    expect(src).toContain("auth: 'manager'")
    expect(src).toContain('analytics:read')
  })
})
