import type { Repositories } from '@/lib/repositories/factory'
import type { FinanceModuleService } from '@/lib/services/finance-module.service'

export class FinanceService {
  constructor(
    private readonly repos: Repositories,
    private readonly module: FinanceModuleService
  ) {}

  async getPaymentsForPage(tenantId: string, role: string, userId: string) {
    const result = await this.module.listPayments(tenantId, role, userId, { limit: 50 })
    const freelancerMap = new Map(
      result.data.map((p) => [
        p.freelancerId,
        { id: p.freelancerId, full_name: p.freelancerName ?? null },
      ])
    )
    return {
      payments: result.data.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        created_at: p.createdAt,
        freelancer_id: p.freelancerId,
      })),
      freelancerMap,
    }
  }

  async approvePayment(
    tenantId: string,
    paymentId: string,
    userId: string,
    notes?: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const result = await this.module.approvePayment(tenantId, paymentId, userId, notes)
    if (!result.ok) return result
    return { ok: true }
  }

  async markPaymentPaid(
    tenantId: string,
    paymentId: string,
    reference: string,
    userId?: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const result = await this.module.markPaymentPaid(
      tenantId,
      paymentId,
      userId ?? 'system',
      reference
    )
    if (!result.ok) return result
    return { ok: true }
  }
}
