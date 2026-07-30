import { describe, expect, it, vi } from 'vitest'
import { FinanceService } from '@/lib/services/finance.service'
import { createMockRepositories } from '@/tests/helpers/mock-repositories'

describe('FinanceService', () => {
  const tenantId = '11111111-1111-1111-1111-111111111111'
  const userId = '22222222-2222-2222-2222-222222222222'
  const paymentId = '33333333-3333-3333-3333-333333333333'

  it('approvePayment rejects non-pending payments', async () => {
    const repos = createMockRepositories({
      invoice: {
        findById: vi.fn().mockResolvedValue({
          id: paymentId,
          status: 'paid',
          freelancer_id: 'f-1',
          amount: 100,
          currency: 'USD',
        }),
      },
    } as never)

    const workflow = { emitEvent: vi.fn() }
    const service = new FinanceService(repos, workflow as never)
    const result = await service.approvePayment(tenantId, userId, { paymentId })
    expect(result).toEqual({ ok: false, error: 'Only pending payments can be approved' })
    expect(workflow.emitEvent).not.toHaveBeenCalled()
  })

  it('approvePayment emits payment.approved event', async () => {
    const repos = createMockRepositories({
      invoice: {
        findById: vi.fn().mockResolvedValue({
          id: paymentId,
          status: 'pending',
          freelancer_id: 'f-1',
          amount: 500,
          currency: 'USD',
        }),
        approve: vi.fn().mockResolvedValue(undefined),
      },
    } as never)

    const workflow = { emitEvent: vi.fn().mockResolvedValue('event-1') }
    const service = new FinanceService(repos, workflow as never)

    const result = await service.approvePayment(tenantId, userId, { paymentId, notes: 'OK' })
    expect(result).toEqual({ ok: true })
    expect(repos.invoice.approve).toHaveBeenCalledWith(paymentId, userId, 'OK')
    expect(workflow.emitEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'payment.approved',
        aggregateId: paymentId,
        idempotencyKey: `payment-approved:${paymentId}`,
      })
    )
  })

  it('markPaymentPaid requires approved status', async () => {
    const repos = createMockRepositories({
      invoice: {
        findById: vi.fn().mockResolvedValue({
          id: paymentId,
          status: 'pending',
          freelancer_id: 'f-1',
          amount: 100,
          currency: 'USD',
        }),
      },
    } as never)

    const service = new FinanceService(repos, { emitEvent: vi.fn() } as never)
    const result = await service.markPaymentPaid(tenantId, userId, {
      paymentId,
      paymentReference: 'REF-1',
    })

    expect(result).toEqual({ ok: false, error: 'Payment must be approved before marking paid' })
  })
})
