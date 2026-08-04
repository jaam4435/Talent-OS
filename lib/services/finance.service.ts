import type { Repositories } from '@/lib/repositories/factory'

export class FinanceService {
  constructor(private readonly repos: Repositories) {}

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
    paymentId: string,
    userId: string,
    notes?: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const payment = await this.repos.invoice.findById(paymentId, tenantId)
    if (!payment) return { ok: false, error: 'Payment not found' }
    if (payment.status !== 'pending') {
      return { ok: false, error: 'Only pending payments can be approved' }
    }

    await this.repos.invoice.approve(paymentId, userId, notes?.trim() || null)
    return { ok: true }
  }

  async markPaymentPaid(
    tenantId: string,
    paymentId: string,
    reference: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const payment = await this.repos.invoice.findById(paymentId, tenantId)
    if (!payment) return { ok: false, error: 'Payment not found' }
    if (payment.status !== 'approved') {
      return { ok: false, error: 'Only approved payments can be marked paid' }
    }

    await this.repos.invoice.markPaid(paymentId, reference)
    return { ok: true }
  }
}
