import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

function read(path: string) {
  return readFileSync(join(ROOT, path), 'utf8')
}

describe('Talent module migration', () => {
  it('creates talent tables and RLS', () => {
    const sql = read('supabase/migrations/025_talent_module.sql')
    expect(sql).toContain('CREATE TABLE talent_experience')
    expect(sql).toContain('CREATE TABLE talent_documents')
    expect(sql).toContain('CREATE TABLE talent_availability_slots')
    expect(sql).toContain('CREATE TABLE talent_import_batches')
    expect(sql).toContain('CREATE TABLE talent_audit_logs')
    expect(sql).toContain('search_talent_advanced')
    expect(sql).toContain('match_talent_skills')
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY')
  })
})

describe('Talent API routes', () => {
  const routes = [
    'app/api/talent/route.ts',
    'app/api/talent/[id]/route.ts',
    'app/api/talent/[id]/experience/route.ts',
    'app/api/talent/[id]/documents/route.ts',
    'app/api/talent/[id]/availability/route.ts',
    'app/api/talent/[id]/completeness/route.ts',
    'app/api/talent/[id]/ai-profile/route.ts',
    'app/api/talent/match/route.ts',
    'app/api/talent/import/route.ts',
    'app/api/talent/audit-logs/route.ts',
  ]

  it.each(routes)('%s uses withApiHandler', (routePath) => {
    expect(read(routePath)).toContain('withApiHandler')
  })

  it('list route requires talent:read', () => {
    expect(read('app/api/talent/route.ts')).toContain("'talent:read'")
  })

  it('import route requires talent:import', () => {
    expect(read('app/api/talent/import/route.ts')).toContain("'talent:import'")
  })

  it('audit route requires talent:audit:read', () => {
    expect(read('app/api/talent/audit-logs/route.ts')).toContain("'talent:audit:read'")
  })
})

describe('Talent AI-ready descriptors', () => {
  it('exports entity context map', () => {
    expect(read('modules/talent/types.ts')).toContain('TALENT_AI_ENTITIES')
  })
})

describe('Talent permissions', () => {
  it('grants talent module permissions to managers', () => {
    expect(read('modules/core/services/permissions.ts')).toContain("'talent:read'")
    expect(read('modules/core/services/permissions.ts')).toContain("'talent:manage'")
    expect(read('modules/core/services/permissions.ts')).toContain("'talent:import'")
  })
})

describe('Backward compatibility', () => {
  it('preserves existing search route', () => {
    expect(read('app/api/talent/search/route.ts')).toContain('searchRoster')
  })

  it('preserves existing TalentService', () => {
    expect(read('lib/services/talent.service.ts')).toContain('class TalentService')
  })
})
