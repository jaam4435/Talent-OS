import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Json } from '@/modules/core/types/database'
import type { ConversationContext, WhatsAppIntent } from '@/lib/whatsapp/types'
import { toPaginatedResult, type PaginatedResult } from '@/lib/repositories/base/types'
import type { WhatsAppConversationSummary, WhatsAppObservabilitySummary } from '@/modules/whatsapp-platform/types'

export class WhatsappConversationRepository extends BaseRepository {
  async getOrCreate(input: {
    tenant_id: string
    freelancer_id: string
    phone: string
  }): Promise<ConversationContext> {
    const { data: existing } = await this.ctx.supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('tenant_id', input.tenant_id)
      .eq('freelancer_id', input.freelancer_id)
      .maybeSingle()

    if (existing) {
      return this.mapRow(existing)
    }

    const { data, error } = await this.ctx.supabase
      .from('whatsapp_conversations')
      .insert({
        tenant_id: input.tenant_id,
        freelancer_id: input.freelancer_id,
        phone: input.phone,
      })
      .select('*')
      .single()

    this.throwIfError(error)
    if (!data) this.notFound('WhatsApp conversation')
    return this.mapRow(data)
  }

  async updateContext(
    tenantId: string,
    freelancerId: string,
    patch: {
      active_intent?: WhatsAppIntent | null
      active_entity_type?: string | null
      active_entity_id?: string | null
      context?: Record<string, unknown>
      last_message_at?: string
    }
  ): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('whatsapp_conversations')
      .update({
        ...patch,
        context: patch.context as Json | undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('freelancer_id', freelancerId)

    this.throwIfError(error)
  }

  async touchMessage(tenantId: string, freelancerId: string, at: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('whatsapp_conversations')
      .update({ last_message_at: at, updated_at: at })
      .eq('tenant_id', tenantId)
      .eq('freelancer_id', freelancerId)

    this.throwIfError(error)
  }

  async list(
    tenantId: string,
    options: { page?: number; limit?: number }
  ): Promise<PaginatedResult<WhatsAppConversationSummary>> {
    const { limit, offset, page } = this.paginate(options)

    const { data, error, count } = await this.ctx.supabase
      .from('whatsapp_conversations')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('last_message_at', { ascending: false })
      .range(offset, offset + limit - 1)

    this.throwIfError(error)

    return toPaginatedResult(
      (data ?? []).map((row) => this.mapSummaryRow(row)),
      { limit, page },
      count ?? undefined
    )
  }

  async getByFreelancer(tenantId: string, freelancerId: string): Promise<WhatsAppConversationSummary | null> {
    const { data } = await this.ctx.supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('freelancer_id', freelancerId)
      .maybeSingle()

    return data ? this.mapSummaryRow(data) : null
  }

  async getModuleSummary(tenantId: string): Promise<WhatsAppObservabilitySummary> {
    const { data, error } = await this.ctx.supabase.rpc('get_whatsapp_module_summary', {
      p_tenant_id: tenantId,
    })
    this.throwIfError(error)

    const row = Array.isArray(data) ? data[0] : data
    return {
      activeConversations: Number(row?.active_conversations ?? 0),
      messagesToday: Number(row?.messages_today ?? 0),
      intentsHandledToday: Number(row?.intents_handled_today ?? 0),
      pendingApprovals: Number(row?.pending_approvals ?? 0),
      auditEntriesToday: Number(row?.audit_entries_today ?? 0),
    }
  }

  private mapSummaryRow(row: {
    id: string
    tenant_id: string
    freelancer_id: string
    phone: string
    active_intent: string | null
    active_entity_type: string | null
    active_entity_id: string | null
    memory_summary?: string | null
    pending_approval_id?: string | null
    last_message_at: string
  }): WhatsAppConversationSummary {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      freelancerId: row.freelancer_id,
      phone: row.phone,
      activeIntent: row.active_intent,
      activeEntityType: row.active_entity_type,
      activeEntityId: row.active_entity_id,
      memorySummary: row.memory_summary ?? null,
      pendingApprovalId: row.pending_approval_id ?? null,
      lastMessageAt: row.last_message_at,
    }
  }

  private mapRow(row: {
    id: string
    tenant_id: string
    freelancer_id: string
    phone: string
    active_intent: string | null
    active_entity_type: string | null
    active_entity_id: string | null
    context: Json
    memory_summary?: string | null
    pending_approval_id?: string | null
    last_message_at: string
  }): ConversationContext {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      freelancerId: row.freelancer_id,
      phone: row.phone,
      activeIntent: (row.active_intent as WhatsAppIntent | null) ?? null,
      activeEntityType: row.active_entity_type,
      activeEntityId: row.active_entity_id,
      context: (row.context as Record<string, unknown>) ?? {},
      lastMessageAt: row.last_message_at,
    }
  }
}
