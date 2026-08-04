import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

function read(path: string) {
  return readFileSync(join(ROOT, path), 'utf8')
}

describe('CRM module migration', () => {
  it('creates demand tables and RLS', () => {
    const sql = read('supabase/migrations/024_crm_module.sql')
    expect(sql).toContain('CREATE TABLE crm_leads')
    expect(sql).toContain('CREATE TABLE crm_deals')
    expect(sql).toContain('CREATE TABLE crm_pipeline_stages')
    expect(sql).toContain('CREATE TABLE crm_contacts')
    expect(sql).toContain('CREATE TABLE crm_contracts')
    expect(sql).toContain('CREATE TABLE crm_audit_logs')
    expect(sql).toContain('seed_crm_pipeline_stages')
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY')
  })
})

describe('CRM API routes', () => {
  const routes = [
    'app/api/crm/pipeline/route.ts',
    'app/api/crm/leads/route.ts',
    'app/api/crm/leads/[id]/convert/route.ts',
    'app/api/crm/companies/route.ts',
    'app/api/crm/deals/route.ts',
    'app/api/crm/deals/[id]/stage/route.ts',
    'app/api/crm/opportunities/route.ts',
    'app/api/crm/audit-logs/route.ts',
  ]

  it.each(routes)('%s uses withApiHandler', (routePath) => {
    expect(read(routePath)).toContain('withApiHandler')
  })

  it('pipeline requires crm:read', () => {
    expect(read('app/api/crm/pipeline/route.ts')).toContain("'crm:read'")
  })

  it('lead convert requires crm:leads:manage', () => {
    expect(read('app/api/crm/leads/[id]/convert/route.ts')).toContain("'crm:leads:manage'")
  })
})

describe('CRM AI-ready descriptors', () => {
  it('exports entity context map', () => {
    expect(read('modules/crm/types.ts')).toContain('CRM_AI_ENTITIES')
  })
})
