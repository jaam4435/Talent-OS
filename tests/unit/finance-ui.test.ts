import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { hasPermission } from '@/modules/core/services/permissions'

const ROOT = process.cwd()

function read(path: string) {
  return readFileSync(join(ROOT, path), 'utf8')
}

describe('Finance UI', () => {
  it('payments page uses REST detail panel', () => {
    const src = read('app/(dashboard)/payments/page.tsx')
    expect(src).toContain('PaymentDetailPanel')
    expect(src).not.toContain("from '@/app/actions/payments'")
  })

  it('payment actions use finance API hook', () => {
    const src = read('components/payments/payment-actions.tsx')
    expect(src).toContain('useFinance')
    expect(src).not.toContain("from '@/app/actions/payments'")
  })

  it('finance API client targets REST endpoints', () => {
    const src = read('lib/api/finance-api.ts')
    expect(src).toContain('/api/finance/payments')
    expect(src).toContain('/approve')
    expect(src).toContain('/mark-paid')
  })
})

describe('Finance permission aliases', () => {
  it('maps finance:read to payments:read for freelancers', () => {
    expect(hasPermission('freelancer', 'finance:read')).toBe(true)
  })

  it('maps finance:approve to payments:approve for admin', () => {
    expect(hasPermission('admin', 'finance:approve')).toBe(true)
  })
})

describe('Deprecated server actions', () => {
  it('marks payments actions as deprecated', () => {
    const src = read('app/actions/payments.ts')
    expect(src).toContain('@deprecated')
  })
})
