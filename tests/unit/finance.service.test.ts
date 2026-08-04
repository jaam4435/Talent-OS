import { describe, expect, it, vi } from 'vitest'
import { FinanceService } from '@/lib/services/finance.service'

function createFinanceService(payment: {
  id: string
  status: string
  tenant_id: string
} | null) {
  const repos = {
    invoice: {
      findById: vi.fn(async () => payment),
      approve: vi.fn(async () => undefined),
      markPaid: vi.fn(async () => undefined),
    },
  }
  return {
    service: new FinanceService(repos as never),
    repos,
  }
}

describe('FinanceService.approvePayment', () => {
  it('approves pending payment', async () => {
    const { service, repos } = createFinanceService({
      id: 'pay-1',
      status: 'pending',
      tenant_id: 'tenant-1',
    })

    const result = await service.approvePayment('tenant-1', 'pay-1', 'user-1', 'ok')
    expect(result.ok).toBe(true)
    expect(repos.invoice.approve).toHaveBeenCalledWith('pay-1', 'user-1', 'ok')
  })

  it('rejects non-pending payment', async () => {
    const { service } = createFinanceService({
      id: 'pay-1',
      status: 'approved',
      tenant_id: 'tenant-1',
    })

    const result = await service.approvePayment('tenant-1', 'pay-1', 'user-1')
    expect(result).toEqual({ ok: false, error: 'Only pending payments can be approved' })
  })
})

describe('FinanceService.markPaymentPaid', () => {
  it('marks approved payment as paid', async () => {
    const { service, repos } = createFinanceService({
      id: 'pay-1',
      status: 'approved',
      tenant_id: 'tenant-1',
    })

    const result = await service.markPaymentPaid('tenant-1', 'pay-1', 'REF-123')
    expect(result.ok).toBe(true)
    expect(repos.invoice.markPaid).toHaveBeenCalledWith('pay-1', 'REF-123')
  })
})
