import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

function read(path: string) {
  return readFileSync(join(ROOT, path), 'utf8')
}

describe('Finance module migration', () => {
  it('creates finance audit table and RLS', () => {
    const sql = read('supabase/migrations/033_finance_module.sql')
    expect(sql).toContain('CREATE TABLE finance_audit_logs')
    expect(sql).toContain('idx_finance_audit_payment')
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY')
  })
})

describe('Finance API routes', () => {
  const routes = [
    'app/api/finance/payments/route.ts',
    'app/api/finance/payments/[id]/route.ts',
    'app/api/finance/payments/[id]/approve/route.ts',
    'app/api/finance/payments/[id]/mark-paid/route.ts',
  ]

  it.each(routes)('%s uses withApiHandler', (routePath) => {
    expect(read(routePath)).toContain('withApiHandler')
  })

  it('list route requires payments:read', () => {
    expect(read('app/api/finance/payments/route.ts')).toContain("'payments:read'")
  })

  it('approve route requires payments:approve', () => {
    expect(read('app/api/finance/payments/[id]/approve/route.ts')).toContain("'payments:approve'")
  })

  it('mark-paid route requires payments:pay', () => {
    expect(read('app/api/finance/payments/[id]/mark-paid/route.ts')).toContain("'payments:pay'")
  })
})

describe('MCP finance adapter', () => {
  it('routes finance server tools through adapter', () => {
    const src = read('lib/mcp/gateway.ts')
    expect(src).toContain("request.serverId === 'finance'")
    expect(src).toContain('invokeFinanceTool')
  })
})

describe('Backward compatibility', () => {
  it('preserves legacy FinanceService facade', () => {
    expect(read('lib/services/finance.service.ts')).toContain('class FinanceService')
  })
})
