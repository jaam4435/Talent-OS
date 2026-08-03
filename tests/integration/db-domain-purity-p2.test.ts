import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createContractSchema } from '@/modules/crm/validation'

const ROOT = process.cwd()

function read(path: string) {
  return readFileSync(join(ROOT, path), 'utf8')
}

describe('Migration 036 — domain purity P2', () => {
  const sql = read('supabase/migrations/036_db_domain_purity_p2.sql')

  it('adds soft delete columns to opportunities and recipients', () => {
    expect(sql).toContain('ALTER TABLE opportunities')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS deleted_at')
    expect(sql).toContain('ALTER TABLE opportunity_recipients')
    expect(sql).toContain('idx_opportunities_active')
    expect(sql).toContain('idx_opp_recipients_active')
    expect(sql).toMatch(/WHERE deleted_at IS NULL/)
  })

  it('dedupes company names and enforces unique lower(name) per tenant', () => {
    expect(sql).toContain('idx_companies_tenant_name_unique')
    expect(sql).toMatch(/lower\(name\)/)
    expect(sql).toContain('row_number() OVER (PARTITION BY tenant_id, lower(name)')
  })

  it('requires signed_at when contract status is signed', () => {
    expect(sql).toContain('crm_contracts_signed_at_required')
    expect(sql).toMatch(/status <> 'signed' OR signed_at IS NOT NULL/)
  })

  it('deprecates activity_logs writes for module-covered entities', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION log_activity')
    expect(sql).toContain('Module audit tables (*_audit_logs) are canonical')
    expect(sql).toContain("'crm_company'")
    expect(sql).toMatch(/RETURN NULL;/)
  })

  it('refreshes analytics views to exclude soft-deleted opportunities', () => {
    expect(sql).toContain('CREATE OR REPLACE VIEW v_dashboard_summary')
    expect(sql).toContain('CREATE OR REPLACE VIEW v_opportunity_fill_rate')
    expect(sql).toContain('CREATE OR REPLACE VIEW v_response_metrics')
    expect(sql).toMatch(/o\.deleted_at IS NULL/)
    expect(sql).toMatch(/or2\.deleted_at IS NULL/)
  })
})

describe('Duplicate company cleanup script', () => {
  it('reports duplicate names per tenant', () => {
    const script = read('scripts/cleanup-duplicate-companies.sql')
    expect(script).toContain('lower(name)')
    expect(script).toContain('HAVING count(*) > 1')
  })
})

describe('Opportunity soft-delete filters', () => {
  it('excludes deleted rows in lead repository reads', () => {
    const src = read('lib/repositories/lead.repository.ts')
    expect(src).toContain(".is('deleted_at', null)")
    expect(src).toContain('async softDelete(')
  })

  it('excludes deleted companies in legacy company repository', () => {
    const src = read('lib/repositories/company.repository.ts')
    expect(src).toContain(".is('deleted_at', null)")
  })
})

describe('Contract signed_at validation', () => {
  it('rejects signed status without signed_at in schema', () => {
    const invalid = createContractSchema.safeParse({
      title: 'MSA',
      status: 'signed',
    })
    expect(invalid.success).toBe(false)

    const valid = createContractSchema.safeParse({
      title: 'MSA',
      status: 'signed',
      signed_at: '2026-08-01T12:00:00.000Z',
    })
    expect(valid.success).toBe(true)
  })

  it('enforces signed_at in CRM demand service before insert', () => {
    const src = read('lib/services/crm-demand.service.ts')
    expect(src).toContain("status === 'signed' && !input.signed_at")
    expect(src).toContain('signed_at is required when status is signed')
  })
})

describe('Company duplicate name handling', () => {
  it('maps unique violation to friendly message in CRM company repository', () => {
    const src = read('lib/repositories/crm-company.repository.ts')
    expect(src).toContain("error?.code === '23505'")
    expect(src).toContain('A company with this name already exists.')
  })

  it('exposes createCompany on CRM API client', () => {
    const src = read('lib/api/crm-api.ts')
    expect(src).toContain("crmRequest<CrmCompany>('/api/crm/companies'")
    expect(src).toContain('createCompany(body')
  })

  it('renders company create form with API error display', () => {
    const src = read('modules/crm/components/company-form.tsx')
    expect(src).toContain('useCrm')
    expect(src).toContain('api.createCompany')
    expect(src).toContain('text-destructive')
  })
})

describe('Audit write path consolidation', () => {
  it('routes CRM mutations through crm_audit_logs via auditAndEmit', () => {
    const src = read('lib/services/crm-demand.service.ts')
    expect(src).toContain('this.repos.crmAudit.record')
  })

  it('documents module audit tables as canonical in observability service', () => {
    const src = read('lib/services/observability.service.ts')
    expect(src).toContain('*_audit_logs')
  })
})
