import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Json } from '@/modules/core/types/database'

export interface N8nIntegrationConfig {
  webhook_base_url: string
  webhook_secret: string
  is_active?: boolean
}

export class IntegrationConfigRepository extends BaseRepository {
  async getN8nConfig(tenantId: string): Promise<N8nIntegrationConfig | null> {
    const { data } = await this.ctx.supabase
      .from('integration_configs')
      .select('config, is_active')
      .eq('tenant_id', tenantId)
      .eq('provider', 'n8n')
      .eq('is_active', true)
      .maybeSingle()

    if (!data?.config) return null

    const config = data.config as Record<string, unknown>
    if (!config.webhook_base_url || !config.webhook_secret) return null

    return {
      webhook_base_url: String(config.webhook_base_url).replace(/\/$/, ''),
      webhook_secret: String(config.webhook_secret),
      is_active: data.is_active,
    }
  }

  async resolveTenantByWhatsAppPhoneNumberId(phoneNumberId: string): Promise<string | null> {
    const { data } = await this.ctx.supabase
      .from('integration_configs')
      .select('tenant_id, config')
      .eq('provider', 'whatsapp')
      .eq('is_active', true)

    for (const row of data ?? []) {
      const config = row.config as Record<string, unknown>
      if (config.phone_number_id === phoneNumberId) {
        return row.tenant_id
      }
    }

    return null
  }
}

export class WebhookDeliveryRepository extends BaseRepository {
  async findByIdempotency(source: string, idempotencyKey: string) {
    const { data } = await this.ctx.supabase
      .from('webhook_deliveries')
      .select('id')
      .eq('source', source)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()
    return data ?? null
  }

  async create(input: {
    tenant_id?: string
    source: string
    idempotency_key: string
    event_type?: string
    payload: Json
    status: string
    error_message?: string
    processed_at?: string
  }): Promise<void> {
    const { error } = await this.ctx.supabase.from('webhook_deliveries').insert(input)
    this.throwIfError(error)
  }
}

export class WhatsappMessageRepository extends BaseRepository {
  async createInbound(input: {
    tenant_id: string
    freelancer_id: string
    wa_message_id: string
    phone: string
    body: string
  }): Promise<void> {
    const { error } = await this.ctx.supabase.from('whatsapp_messages').insert({
      tenant_id: input.tenant_id,
      freelancer_id: input.freelancer_id,
      direction: 'inbound',
      wa_message_id: input.wa_message_id,
      phone: input.phone,
      body: input.body,
      status: 'received',
    })
    this.throwIfError(error)
  }

  async updateDeliveryStatus(waMessageId: string, status: string): Promise<string | null> {
    const { error } = await this.ctx.supabase
      .from('whatsapp_messages')
      .update({ status })
      .eq('wa_message_id', waMessageId)
    this.throwIfError(error)

    if (status !== 'delivered') return null

    const { data: message } = await this.ctx.supabase
      .from('whatsapp_messages')
      .select('entity_id')
      .eq('wa_message_id', waMessageId)
      .maybeSingle()

    return message?.entity_id ?? null
  }
}
