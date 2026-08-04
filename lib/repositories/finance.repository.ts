import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { PaginatedResult } from '@/lib/repositories/base/types'
import { toPaginatedResult } from '@/lib/repositories/base/types'
import type { Json } from '@/modules/core/types/database'
import type { FinanceAuditEntry, FinancePayment } from '@/modules/finance/types'
import type { InvoiceRow } from '@/lib/repositories/invoice.repository'
import type { PaymentStatus } from '@/modules/core/types/enums'

export interface FinanceAuditInput {
  tenant_id: string
  payment_id: string
  actor_id: string | null
  action: string
  before_state?: Record<string, unknown> | null
  after_state?: Record<string, unknown> | null
  metadata?: Record<string, unknown>
}

export function mapPaymentRow(row: InvoiceRow): FinancePayment {
  return {
    id: row.id,
    milestoneId: row.milestone_id,
    projectId: row.project_id,
    freelancerId: row.freelancer_id,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status as FinancePayment['status'],
    paymentReference: row.payment_reference,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    paidAt: row.paid_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class FinanceRepository extends BaseRepository {
  async recordAudit(input: FinanceAuditInput): Promise<void> {
    const { error } = await this.ctx.supabase.from('finance_audit_logs').insert({
      tenant_id: input.tenant_id,
      payment_id: input.payment_id,
      actor_id: input.actor_id,
      action: input.action,
      before_state: (input.before_state ?? null) as Json,
      after_state: (input.after_state ?? null) as Json,
      metadata: (input.metadata ?? {}) as Json,
    })
    this.throwIfError(error)
  }

  async listAuditByPayment(tenantId: string, paymentId: string): Promise<FinanceAuditEntry[]> {
    const { data, error } = await this.ctx.supabase
      .from('finance_audit_logs')
      .select(
        'id, payment_id, action, actor_id, before_state, after_state, metadata, created_at'
      )
      .eq('tenant_id', tenantId)
      .eq('payment_id', paymentId)
      .order('created_at', { ascending: true })

    this.throwIfError(error)

    return (data ?? []).map((row) => ({
      id: row.id,
      paymentId: row.payment_id,
      action: row.action,
      actorId: row.actor_id,
      beforeState: (row.before_state as Record<string, unknown> | null) ?? null,
      afterState: (row.after_state as Record<string, unknown> | null) ?? null,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: row.created_at,
    }))
  }

  async listPayments(
    tenantId: string,
    filters?: { freelancerId?: string; projectId?: string; status?: PaymentStatus },
    pagination?: { page?: number; limit?: number }
  ): Promise<PaginatedResult<FinancePayment>> {
    const { limit, offset, page } = this.paginate({ ...pagination, limit: pagination?.limit ?? 50 })

    let query = this.ctx.supabase
      .from('payments')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)

    if (filters?.freelancerId) query = query.eq('freelancer_id', filters.freelancerId)
    if (filters?.projectId) query = query.eq('project_id', filters.projectId)
    if (filters?.status) query = query.eq('status', filters.status)

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    this.throwIfError(error)
    return toPaginatedResult(
      (data ?? []).map((row) => mapPaymentRow(row as InvoiceRow)),
      { limit, page },
      count ?? undefined
    )
  }
}
