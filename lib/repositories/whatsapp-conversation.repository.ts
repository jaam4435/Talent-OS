import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Json } from '@/modules/core/types/database'
import type { ConversationContext, WhatsAppIntent } from '@/lib/whatsapp/types'

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

  private mapRow(row: {
    tenant_id: string
    freelancer_id: string
    phone: string
    active_intent: string | null
    active_entity_type: string | null
    active_entity_id: string | null
    context: Json
    last_message_at: string
  }): ConversationContext {
    return {
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
