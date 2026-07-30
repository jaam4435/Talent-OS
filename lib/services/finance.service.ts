import type { Repositories } from '@/lib/repositories/factory'
import type { WorkflowService } from '@/lib/services/workflow.service'
import { parseSchema } from '@/modules/core/utils/validation'
import {
  approvePaymentSchema,
  markPaymentPaidSchema,
} from '@/modules/finance/schemas'
import { FinanceEvents } from '@/modules/finance/events'

export class FinanceService {
  constructor(
    private readonly repos: Repositories,
    private readonly workflow: WorkflowService
  ) {}

  async getPaymentsForPage(tenantId: string, role: string, userId: string) {
    let freelancerId: string | undefined
    if (role === 'freelancer') {
      freelancerId = (await this.repos.talent.findIdByUserId(userId, tenantId)) ?? undefined
    }

    const result = await this.repos.invoice.listByTenant(tenantId, { freelancerId })
    const freelancerIds = [...new Set(result.data.map((p) => p.freelancer_id))]
    const freelancers = await this.repos.talent.findNamesByIds(freelancerIds)
    const freelancerMap = new Map(freelancers.map((f) => [f.id, f]))

    return { payments: result.data, freelancerMap }
  }

  async approvePayment(
    tenantId: string,
    userId: string,
    input: { paymentId: string; notes?: string }
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const data = parseSchema(approvePaymentSchema, input)
    const payment = await this.repos.invoice.findById(data.paymentId, tenantId)

    if (!payment) return { ok: false, error: 'Payment not found' }
    if (payment.status !== 'pending') {
      return { ok: false, error: 'Only pending payments can be approved' }
    }

    await this.repos.invoice.approve(data.paymentId, userId, data.notes ?? null)

    await this.workflow.emitEvent({
      tenantId,
      eventType: FinanceEvents.PAYMENT_APPROVED,
      aggregateType: 'payment',
      aggregateId: data.paymentId,
      idempotencyKey: `payment-approved:${data.paymentId}`,
      actorId: userId,
      payload: {
        payment_id: data.paymentId,
        freelancer_id: payment.freelancer_id,
        amount: payment.amount,
        currency: payment.currency,
        notes: data.notes ?? null,
      },
    })

    return { ok: true }
  }

  async markPaymentPaid(
    tenantId: string,
    userId: string,
    input: { paymentId: string; paymentReference: string }
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const data = parseSchema(markPaymentPaidSchema, input)
    const payment = await this.repos.invoice.findById(data.paymentId, tenantId)

    if (!payment) return { ok: false, error: 'Payment not found' }
    if (!['approved', 'processing'].includes(payment.status)) {
      return { ok: false, error: 'Payment must be approved before marking paid' }
    }

    await this.repos.invoice.markPaid(data.paymentId, data.paymentReference)

    await this.workflow.emitEvent({
      tenantId,
      eventType: FinanceEvents.PAYMENT_PAID,
      aggregateType: 'payment',
      aggregateId: data.paymentId,
      idempotencyKey: `payment-paid:${data.paymentId}`,
      actorId: userId,
      payload: {
        payment_id: data.paymentId,
        freelancer_id: payment.freelancer_id,
        amount: payment.amount,
        currency: payment.currency,
        payment_reference: data.paymentReference,
      },
    })

    return { ok: true }
  }

  async getPaymentById(paymentId: string, tenantId: string) {
    return this.repos.invoice.findById(paymentId, tenantId)
  }

  async listPayments(
    tenantId: string,
    filters?: { status?: string; freelancerId?: string; page?: number; limit?: number }
  ) {
    return this.repos.invoice.listByTenant(
      tenantId,
      {
        status: filters?.status as never,
        freelancerId: filters?.freelancerId,
      },
      { page: filters?.page, limit: filters?.limit }
    )
  }

  async disputePayment(
    tenantId: string,
    userId: string,
    input: { paymentId: string; disputeReason: string }
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const payment = await this.repos.invoice.findById(input.paymentId, tenantId)
    if (!payment) return { ok: false, error: 'Payment not found' }
    await this.repos.invoice.dispute(input.paymentId, tenantId, input.disputeReason)
    await this.workflow.emitEvent({
      tenantId,
      eventType: FinanceEvents.PAYMENT_DISPUTED,
      aggregateType: 'payment',
      aggregateId: input.paymentId,
      idempotencyKey: `payment-disputed:${input.paymentId}`,
      actorId: userId,
      payload: { payment_id: input.paymentId, reason: input.disputeReason },
    })
    return { ok: true }
  }

  async exportPayments(
    tenantId: string,
    input: { fromDate: string; toDate: string; status?: string }
  ) {
    const rows = await this.repos.invoice.listForExport(
      tenantId,
      input.fromDate,
      input.toDate,
      input.status as never
    )
    const header = 'id,amount,currency,status,created_at,paid_at,freelancer_id,payment_reference'
    const lines = rows.map((r) =>
      [
        r.id,
        r.amount,
        r.currency,
        r.status,
        r.created_at,
        r.paid_at ?? '',
        r.freelancer_id,
        r.payment_reference ?? '',
      ].join(',')
    )
    return { csv: [header, ...lines].join('\n'), row_count: rows.length }
  }

  async getPaymentAging(tenantId: string) {
    return this.repos.invoice.getAgingSummary(tenantId)
  }
}
