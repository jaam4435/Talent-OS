import { describe, expect, it, vi } from 'vitest'
import { FinanceService } from '@/lib/services/finance.service'
import { FinanceModuleService } from '@/lib/services/finance-module.service'

function createFinanceService() {
  const module = {
    listPayments: vi.fn(async () => ({
      data: [
        {
          id: 'pay-1',
          freelancerId: 'fl-1',
          freelancerName: 'Jane',
          amount: 100,
          currency: 'USD',
          status: 'pending',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      page: 1,
      limit: 50,
      total: 1,
      hasMore: false,
    })),
    approvePayment: vi.fn(async () => ({ ok: true as const, payment: { id: 'pay-1', status: 'approved' } })),
    markPaymentPaid: vi.fn(async () => ({ ok: true as const, payment: { id: 'pay-1', status: 'paid' } })),
  }

  return {
    service: new FinanceService({} as never, module as unknown as FinanceModuleService),
    module,
  }
}

describe('FinanceService delegation', () => {
  it('getPaymentsForPage delegates to finance module', async () => {
    const { service, module } = createFinanceService()
    const result = await service.getPaymentsForPage('tenant-1', 'admin', 'user-1')
    expect(module.listPayments).toHaveBeenCalled()
    expect(result.payments).toHaveLength(1)
    expect(result.freelancerMap.get('fl-1')?.full_name).toBe('Jane')
  })

  it('approvePayment delegates to finance module', async () => {
    const { service, module } = createFinanceService()
    const result = await service.approvePayment('tenant-1', 'pay-1', 'user-1', 'ok')
    expect(result.ok).toBe(true)
    expect(module.approvePayment).toHaveBeenCalledWith('tenant-1', 'pay-1', 'user-1', 'ok')
  })

  it('markPaymentPaid delegates to finance module', async () => {
    const { service, module } = createFinanceService()
    const result = await service.markPaymentPaid('tenant-1', 'pay-1', 'REF-1', 'user-1')
    expect(result.ok).toBe(true)
    expect(module.markPaymentPaid).toHaveBeenCalledWith('tenant-1', 'pay-1', 'user-1', 'REF-1')
  })
})
