import { BaseRepository } from '@/lib/repositories/base/base.repository'
import { decryptJson, encryptJson } from '@/lib/integrations/encryption'
import type { Json } from '@/modules/core/types/database'

export interface N8nIntegrationConfig {
  webhook_base_url: string
  webhook_secret: string
  is_active?: boolean
}

const ENCRYPTED_PREFIX = 'enc:v1:'

function isEncryptedPayload(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(ENCRYPTED_PREFIX)
}

function encryptConfig(config: Record<string, unknown>): Json {
  try {
    const payload = ENCRYPTED_PREFIX + encryptJson(config)
    return payload as unknown as Json
  } catch {
    return config as Json
  }
}

function decryptConfig(config: Json | Record<string, unknown>): Record<string, unknown> {
  if (isEncryptedPayload(config)) {
    return decryptJson(config.slice(ENCRYPTED_PREFIX.length))
  }
  return (config ?? {}) as Record<string, unknown>
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

    const config = decryptConfig(data.config as Json)
    if (!config.webhook_base_url || !config.webhook_secret) return null

    return {
      webhook_base_url: String(config.webhook_base_url).replace(/\/$/, ''),
      webhook_secret: String(config.webhook_secret),
      is_active: data.is_active,
    }
  }

  async resolveTenantByWhatsAppPhoneNumberId(phoneNumberId: string): Promise<string | null> {
    const { data, error } = await this.ctx.supabase
      .from('integration_configs')
      .select('tenant_id, config')
      .eq('provider', 'whatsapp')
      .eq('is_active', true)

    this.throwIfError(error)

    for (const row of data ?? []) {
      const config = decryptConfig(row.config as Json)
      const resolvedId = config.phone_number_id as string | undefined
      if (resolvedId && String(resolvedId) === phoneNumberId) {
        return row.tenant_id
      }
    }

    return null
  }

  async upsertConfig(input: {
    tenantId: string
    provider: string
    config: Record<string, unknown>
    isActive?: boolean
    whatsappPhoneNumberId?: string | null
  }): Promise<void> {
    const row: Record<string, unknown> = {
      tenant_id: input.tenantId,
      provider: input.provider,
      config: encryptConfig(input.config),
      is_active: input.isActive ?? true,
      updated_at: new Date().toISOString(),
    }

    if (input.whatsappPhoneNumberId !== undefined) {
      row.whatsapp_phone_number_id = input.whatsappPhoneNumberId
    }

    const { error } = await this.ctx.supabase.from('integration_configs').upsert(row as never, {
      onConflict: 'tenant_id,provider',
    })
    this.throwIfError(error)
    this.invalidateTable('integration_configs')
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
    correlation_id?: string
    event_type?: string
    payload: Json
    status: string
    error_message?: string
    processed_at?: string
  }): Promise<void> {
    const { error } = await this.ctx.supabase.from('webhook_deliveries').insert(input)
    this.throwIfError(error)
  }

  async markProcessed(source: string, idempotencyKey: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('webhook_deliveries')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('source', source)
      .eq('idempotency_key', idempotencyKey)
    this.throwIfError(error)
  }

  async purgeOlderThanHours(hours: number): Promise<number> {
    const cutoff = new Date(Date.now() - hours * 3600_000).toISOString()
    const { data, error } = await this.ctx.supabase
      .from('webhook_deliveries')
      .delete()
      .lt('created_at', cutoff)
      .select('id')

    this.throwIfError(error)
    return data?.length ?? 0
  }

  async createEmailLog(input: {
    tenant_id: string
    to_email?: string
    template_name?: string
    subject?: string
    provider_id?: string
    entity_type?: string
    entity_id?: string
  }): Promise<void> {
    const { error } = await this.ctx.supabase.from('email_logs').insert({
      tenant_id: input.tenant_id,
      to_email: input.to_email,
      template_name: input.template_name,
      subject: input.subject,
      status: 'sent',
      provider_id: input.provider_id,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
    })
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
