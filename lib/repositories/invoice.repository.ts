import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { PaginationParams, PaginatedResult } from '@/lib/repositories/base/types'
import { toPaginatedResult } from '@/lib/repositories/base/types'
import type { Tables } from '@/modules/core/types/database'
import type { PaymentStatus } from '@/modules/core/types/enums'

export type InvoiceRow = Tables<'payments'>

export interface InvoiceListItem {
  id: string
  amount: number
  currency: string
  status: string
  created_at: string
  freelancer_id: string
}

export class InvoiceRepository extends BaseRepository {
  async findById(paymentId: string, tenantId: string): Promise<InvoiceRow | null> {
    const { data } = await this.ctx.supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    return data ?? null
  }

  async listByTenant(
    tenantId: string,
    filters?: { freelancerId?: string; status?: PaymentStatus },
    pagination?: PaginationParams
  ): Promise<PaginatedResult<InvoiceListItem>> {
    const { limit, offset, page } = this.paginate({ ...pagination, limit: pagination?.limit ?? 50 })

    let query = this.ctx.supabase
      .from('payments')
      .select('id, amount, currency, status, created_at, freelancer_id', { count: 'exact' })
      .eq('tenant_id', tenantId)

    if (filters?.freelancerId) query = query.eq('freelancer_id', filters.freelancerId)
    if (filters?.status) query = query.eq('status', filters.status)

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    this.throwIfError(error)
    return toPaginatedResult((data ?? []) as InvoiceListItem[], { limit, page }, count ?? undefined)
  }

  async update(paymentId: string, patch: Record<string, unknown>): Promise<void> {
    const { error } = await this.ctx.supabase.from('payments').update(patch as never).eq('id', paymentId)
    this.throwIfError(error)
    this.invalidateTable('payments')
  }

  async approve(paymentId: string, approvedBy: string, notes?: string | null): Promise<void> {
    await this.update(paymentId, {
      status: 'approved' satisfies PaymentStatus,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      notes: notes ?? null,
    })
  }

  async markPaid(paymentId: string, reference: string, paidAt?: string): Promise<void> {
    await this.update(paymentId, {
      status: 'paid' satisfies PaymentStatus,
      payment_reference: reference,
      paid_at: paidAt ?? new Date().toISOString(),
    })
  }

  async dispute(paymentId: string, tenantId: string, reason: string): Promise<void> {
    const payment = await this.findById(paymentId, tenantId)
    if (!payment) this.notFound('Payment')
    await this.update(paymentId, {
      status: 'disputed' satisfies PaymentStatus,
      notes: reason,
    })
  }

  async listForExport(tenantId: string, fromDate: string, toDate: string, status?: PaymentStatus) {
    let query = this.ctx.supabase
      .from('payments')
      .select('id, amount, currency, status, created_at, paid_at, freelancer_id, payment_reference')
      .eq('tenant_id', tenantId)
      .gte('created_at', fromDate)
      .lte('created_at', toDate)
      .order('created_at')

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    this.throwIfError(error)
    return data ?? []
  }

  async getAgingSummary(tenantId: string) {
    const { data, error } = await this.ctx.supabase
      .from('payments')
      .select('id, amount, currency, status, created_at')
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'approved', 'processing'])
    this.throwIfError(error)

    const now = Date.now()
    const buckets = { under_7d: 0, days_7_30: 0, over_30d: 0, total_amount: 0 }

    for (const row of data ?? []) {
      const ageMs = now - new Date(row.created_at).getTime()
      const ageDays = ageMs / (1000 * 60 * 60 * 24)
      buckets.total_amount += Number(row.amount)
      if (ageDays <= 7) buckets.under_7d += 1
      else if (ageDays <= 30) buckets.days_7_30 += 1
      else buckets.over_30d += 1
    }

    return buckets
  }
}
