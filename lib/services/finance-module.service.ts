import type { Repositories } from '@/lib/repositories/factory'
import { mapPaymentRow } from '@/lib/repositories/finance.repository'
import type { PaginatedResult } from '@/lib/repositories/base/types'
import type { PaymentStatus } from '@/modules/core/types/enums'
import {
  FINANCE_EVENT_TYPES,
  type FinancePayment,
  type FinancePaymentDetail,
  type FinancePaymentListItem,
  type FinanceTimelineEvent,
} from '@/modules/finance/types'

export class FinanceModuleService {
  constructor(private readonly repos: Repositories) {}

  async listPayments(
    tenantId: string,
    role: string,
    userId: string,
    options?: {
      page?: number
      limit?: number
      status?: PaymentStatus
      freelancerId?: string
      projectId?: string
    }
  ): Promise<PaginatedResult<FinancePaymentListItem>> {
    let freelancerId = options?.freelancerId
    if (role === 'freelancer') {
      freelancerId = (await this.repos.talent.findIdByUserId(userId, tenantId)) ?? undefined
    }

    const result = await this.repos.finance.listPayments(
      tenantId,
      {
        freelancerId,
        projectId: options?.projectId,
        status: options?.status,
      },
      { page: options?.page, limit: options?.limit }
    )

    const freelancerIds = [...new Set(result.data.map((p) => p.freelancerId))]
    const freelancers = await this.repos.talent.findNamesByIds(freelancerIds)
    const freelancerMap = new Map(freelancers.map((f) => [f.id, f.full_name]))

    return {
      ...result,
      data: result.data.map((payment) => ({
        ...payment,
        freelancerName: freelancerMap.get(payment.freelancerId) ?? null,
      })),
    }
  }

  async getPayment(
    tenantId: string,
    role: string,
    userId: string,
    paymentId: string
  ): Promise<FinancePaymentDetail | null> {
    const row = await this.repos.invoice.findById(paymentId, tenantId)
    if (!row) return null

    if (role === 'freelancer') {
      const freelancerId = await this.repos.talent.findIdByUserId(userId, tenantId)
      if (!freelancerId || row.freelancer_id !== freelancerId) return null
    }

    const payment = mapPaymentRow(row)
    const auditLogs = await this.repos.finance.listAuditByPayment(tenantId, paymentId)
    const timeline = this.buildTimeline(payment, auditLogs)

    return { ...payment, auditLogs, timeline }
  }

  async approvePayment(
    tenantId: string,
    paymentId: string,
    userId: string,
    notes?: string
  ): Promise<{ ok: true; payment: FinancePayment } | { ok: false; error: string }> {
    const row = await this.repos.invoice.findById(paymentId, tenantId)
    if (!row) return { ok: false, error: 'Payment not found' }
    if (row.status !== 'pending') {
      return { ok: false, error: 'Only pending payments can be approved' }
    }

    const beforeState = { status: row.status, approved_at: row.approved_at }
    await this.repos.invoice.approve(paymentId, userId, notes?.trim() || null)

    const updated = await this.repos.invoice.findById(paymentId, tenantId)
    const payment = mapPaymentRow(updated!)

    await this.auditAndEmit({
      tenantId,
      actorId: userId,
      paymentId,
      action: 'payment.approved',
      eventType: FINANCE_EVENT_TYPES.APPROVED,
      beforeState,
      afterState: { status: payment.status, approved_at: payment.approvedAt, notes: payment.notes },
    })

    return { ok: true, payment }
  }

  async markPaymentPaid(
    tenantId: string,
    paymentId: string,
    userId: string,
    reference: string
  ): Promise<{ ok: true; payment: FinancePayment } | { ok: false; error: string }> {
    const row = await this.repos.invoice.findById(paymentId, tenantId)
    if (!row) return { ok: false, error: 'Payment not found' }
    if (row.status !== 'approved') {
      return { ok: false, error: 'Only approved payments can be marked paid' }
    }

    const beforeState = { status: row.status, paid_at: row.paid_at, payment_reference: row.payment_reference }
    await this.repos.invoice.markPaid(paymentId, reference)

    const updated = await this.repos.invoice.findById(paymentId, tenantId)
    const payment = mapPaymentRow(updated!)

    await this.auditAndEmit({
      tenantId,
      actorId: userId,
      paymentId,
      action: 'payment.paid',
      eventType: FINANCE_EVENT_TYPES.PAID,
      beforeState,
      afterState: {
        status: payment.status,
        paid_at: payment.paidAt,
        payment_reference: payment.paymentReference,
      },
      metadata: { payment_reference: reference },
    })

    return { ok: true, payment }
  }

  private buildTimeline(
    payment: FinancePayment,
    auditLogs: FinancePaymentDetail['auditLogs']
  ): FinanceTimelineEvent[] {
    const events: FinanceTimelineEvent[] = [
      {
        id: `${payment.id}-created`,
        label: 'Payment created',
        status: 'created',
        occurredAt: payment.createdAt,
      },
    ]

    if (payment.approvedAt) {
      events.push({
        id: `${payment.id}-approved`,
        label: 'Approved for payout',
        status: 'approved',
        occurredAt: payment.approvedAt,
        actorId: payment.approvedBy,
        detail: payment.notes,
      })
    }

    if (payment.paidAt) {
      events.push({
        id: `${payment.id}-paid`,
        label: 'Marked paid',
        status: 'paid',
        occurredAt: payment.paidAt,
        detail: payment.paymentReference,
      })
    }

    for (const log of auditLogs) {
      if (log.action === 'payment.approved' || log.action === 'payment.paid') continue
      events.push({
        id: log.id,
        label: log.action.replace(/\./g, ' '),
        status: payment.status,
        occurredAt: log.createdAt,
        actorId: log.actorId,
      })
    }

    return events.sort(
      (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
    )
  }

  private async auditAndEmit(input: {
    tenantId: string
    actorId: string
    paymentId: string
    action: string
    eventType: string
    beforeState?: Record<string, unknown> | null
    afterState?: Record<string, unknown> | null
    metadata?: Record<string, unknown>
  }) {
    await this.repos.finance.recordAudit({
      tenant_id: input.tenantId,
      payment_id: input.paymentId,
      actor_id: input.actorId,
      action: input.action,
      before_state: input.beforeState ?? null,
      after_state: input.afterState ?? null,
      metadata: input.metadata,
    })

    await this.repos.domainEvent.emit({
      tenantId: input.tenantId,
      eventType: input.eventType,
      aggregateType: 'payment',
      aggregateId: input.paymentId,
      idempotencyKey: `${input.eventType}:${input.paymentId}:${Date.now()}`,
      actorId: input.actorId,
      payload: {
        action: input.action,
        before: input.beforeState ?? null,
        after: input.afterState ?? null,
        ...(input.metadata ?? {}),
      },
    })
  }
}
