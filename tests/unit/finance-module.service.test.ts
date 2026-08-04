import { describe, expect, it, vi } from 'vitest'
import { FinanceModuleService } from '@/lib/services/finance-module.service'
import type { InvoiceRow } from '@/lib/repositories/invoice.repository'

const basePayment: InvoiceRow = {
  id: 'pay-1',
  tenant_id: 'tenant-1',
  project_id: 'proj-1',
  milestone_id: 'ms-1',
  freelancer_id: 'fl-1',
  amount: 1000,
  currency: 'USD',
  status: 'pending',
  approved_by: null,
  approved_at: null,
  paid_at: null,
  payment_reference: null,
  dispute_reason: null,
  notes: null,
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
}

function createModuleService(payment: InvoiceRow | null) {
  let current = payment ? { ...payment } : null
  const repos = {
    invoice: {
      findById: vi.fn(async () => (current ? { ...current } : null)),
      approve: vi.fn(async (id: string, approvedBy: string, notes?: string | null) => {
        if (current) {
          current = {
            ...current,
            status: 'approved',
            approved_by: approvedBy,
            approved_at: '2026-08-02T12:00:00.000Z',
            notes: notes ?? null,
          }
        }
      }),
      markPaid: vi.fn(async (id: string, reference: string) => {
        if (current) {
          current = {
            ...current,
            status: 'paid',
            payment_reference: reference,
            paid_at: '2026-08-02T14:00:00.000Z',
          }
        }
      }),
    },
    finance: {
      recordAudit: vi.fn(async () => undefined),
      listAuditByPayment: vi.fn(async () => []),
      listPayments: vi.fn(async () => ({
        data: [],
        page: 1,
        limit: 50,
        total: 0,
        hasMore: false,
      })),
    },
    domainEvent: {
      emit: vi.fn(async () => 'evt-1'),
    },
    talent: {
      findIdByUserId: vi.fn(async () => 'fl-1'),
      findNamesByIds: vi.fn(async () => []),
    },
  }

  return {
    service: new FinanceModuleService(repos as never),
    repos,
  }
}

describe('FinanceModuleService.approvePayment', () => {
  it('approves pending payment and records audit + event', async () => {
    const { service, repos } = createModuleService({ ...basePayment })

    const result = await service.approvePayment('tenant-1', 'pay-1', 'user-1', 'ok')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.payment.status).toBe('approved')
    expect(repos.invoice.approve).toHaveBeenCalledWith('pay-1', 'user-1', 'ok')
    expect(repos.finance.recordAudit).toHaveBeenCalled()
    expect(repos.domainEvent.emit).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'finance.payment.approved' })
    )
  })

  it('rejects non-pending payment', async () => {
    const { service } = createModuleService({ ...basePayment, status: 'approved' })
    const result = await service.approvePayment('tenant-1', 'pay-1', 'user-1')
    expect(result).toEqual({ ok: false, error: 'Only pending payments can be approved' })
  })
})

describe('FinanceModuleService.markPaymentPaid', () => {
  it('marks approved payment as paid', async () => {
    const { service, repos } = createModuleService({ ...basePayment, status: 'approved' })

    const result = await service.markPaymentPaid('tenant-1', 'pay-1', 'user-1', 'REF-123')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.payment.status).toBe('paid')
    expect(repos.invoice.markPaid).toHaveBeenCalledWith('pay-1', 'REF-123')
    expect(repos.finance.recordAudit).toHaveBeenCalled()
    expect(repos.domainEvent.emit).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'finance.payment.paid' })
    )
  })

  it('rejects non-approved payment', async () => {
    const { service } = createModuleService({ ...basePayment, status: 'pending' })
    const result = await service.markPaymentPaid('tenant-1', 'pay-1', 'user-1', 'REF-123')
    expect(result).toEqual({ ok: false, error: 'Only approved payments can be marked paid' })
  })
})

describe('FinanceModuleService.getPayment', () => {
  it('builds timeline from payment fields', async () => {
    const { service } = createModuleService({
      ...basePayment,
      status: 'paid',
      approved_at: '2026-08-02T12:00:00.000Z',
      approved_by: 'user-1',
      paid_at: '2026-08-02T14:00:00.000Z',
      payment_reference: 'REF-1',
    })

    const detail = await service.getPayment('tenant-1', 'admin', 'user-1', 'pay-1')
    expect(detail?.timeline.map((e) => e.label)).toEqual([
      'Payment created',
      'Approved for payout',
      'Marked paid',
    ])
  })
})
