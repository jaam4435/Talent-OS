import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { WhatsAppApprovalGate } from '@/modules/whatsapp-platform/types'

export class WhatsappApprovalGateRepository extends BaseRepository {
  async create(input: {
    tenant_id: string
    approval_request_id: string
    freelancer_id?: string | null
    phone?: string | null
  }): Promise<WhatsAppApprovalGate> {
    const { data, error } = await this.ctx.supabase
      .from('whatsapp_approval_gates')
      .insert({
        tenant_id: input.tenant_id,
        approval_request_id: input.approval_request_id,
        freelancer_id: input.freelancer_id ?? null,
        phone: input.phone ?? null,
      })
      .select('*')
      .single()

    this.throwIfError(error)
    if (!data) this.notFound('WhatsApp approval gate')
    return this.mapRow(data)
  }

  async findPendingByFreelancer(
    tenantId: string,
    freelancerId: string
  ): Promise<WhatsAppApprovalGate | null> {
    const { data } = await this.ctx.supabase
      .from('whatsapp_approval_gates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('freelancer_id', freelancerId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return data ? this.mapRow(data) : null
  }

  async resolve(id: string, tenantId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('whatsapp_approval_gates')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    this.throwIfError(error)
  }

  async listPending(tenantId: string): Promise<WhatsAppApprovalGate[]> {
    const { data, error } = await this.ctx.supabase
      .from('whatsapp_approval_gates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    this.throwIfError(error)
    return (data ?? []).map((row) => this.mapRow(row))
  }

  private mapRow(row: {
    id: string
    tenant_id: string
    approval_request_id: string
    freelancer_id: string | null
    phone: string | null
    status: string
    created_at: string
    resolved_at: string | null
  }): WhatsAppApprovalGate {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      approvalRequestId: row.approval_request_id,
      freelancerId: row.freelancer_id,
      phone: row.phone,
      status: row.status as WhatsAppApprovalGate['status'],
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
    }
  }
}
