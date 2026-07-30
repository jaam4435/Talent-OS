import type { Repositories } from '@/lib/repositories/factory'
import type { N8nIntegrationConfig } from '@/lib/repositories/integration.repository'
import type { Json } from '@/modules/core/types/database'
import type { CRMService } from '@/lib/services/crm.service'
import type { AIService } from '@/lib/services/ai.service'

export type { N8nIntegrationConfig }

export class IntegrationService {
  constructor(
    private readonly repos: Repositories,
    private readonly crm: CRMService,
    private readonly ai: AIService
  ) {}

  async getN8nConfig(tenantId: string): Promise<N8nIntegrationConfig | null> {
    return this.repos.integration.getN8nConfig(tenantId)
  }

  async resolveTenantByWhatsAppPhoneNumberId(phoneNumberId: string): Promise<string | null> {
    return this.repos.integration.resolveTenantByWhatsAppPhoneNumberId(phoneNumberId)
  }

  async findWebhookDelivery(source: string, idempotencyKey: string) {
    return this.repos.webhookDelivery.findByIdempotency(source, idempotencyKey)
  }

  async createWebhookDelivery(input: {
    tenant_id?: string
    source: string
    idempotency_key: string
    event_type?: string
    payload: Json
    status: string
    error_message?: string
    processed_at?: string
    correlation_id?: string
  }): Promise<void> {
    await this.repos.webhookDelivery.create(input)
  }

  async purgeWebhookDeliveries(retentionHours = 72): Promise<number> {
    return this.repos.webhookDelivery.purgeOlderThanHours(retentionHours)
  }

  async markWebhookDeliveryProcessed(source: string, idempotencyKey: string): Promise<void> {
    await this.repos.webhookDelivery.markProcessed(source, idempotencyKey)
  }

  async createInboundWhatsApp(input: {
    tenant_id: string
    freelancer_id: string
    wa_message_id: string
    phone: string
    body: string
  }): Promise<void> {
    await this.repos.whatsapp.createInbound(input)
  }

  async updateWhatsAppDeliveryStatus(waMessageId: string, status: string): Promise<string | null> {
    const recipientId = await this.repos.whatsapp.updateDeliveryStatus(waMessageId, status)
    if (recipientId) {
      await this.crm.markWhatsAppDelivered(recipientId)
    }
    return recipientId
  }

  async processN8nWebhook(
    body: Record<string, unknown>,
    idempotencyKey: string
  ): Promise<{ duplicate: boolean }> {
    const existing = await this.findWebhookDelivery('n8n', idempotencyKey)
    if (existing) {
      return { duplicate: true }
    }

    await this.createWebhookDelivery({
      tenant_id: (body.tenant_id as string) ?? undefined,
      source: 'n8n',
      idempotency_key: idempotencyKey,
      correlation_id: (body.correlation_id as string) ?? undefined,
      event_type: body.event as string,
      payload: body as Json,
      status: 'received',
    })

    const data = (body.data ?? {}) as Record<string, unknown>

    switch (body.event) {
      case 'whatsapp.send_completed': {
        const waMessageId = data.wa_message_id as string | undefined
        if (waMessageId) {
          await this.updateWhatsAppDeliveryStatus(waMessageId, (data.status as string) ?? 'sent')
        }
        const entityId = data.entity_id as string | undefined
        if (entityId && data.whatsapp_sent_at) {
          await this.crm.updateRecipientWhatsAppSent(entityId, {
            whatsapp_sent_at: data.whatsapp_sent_at as string,
            whatsapp_delivered: data.status === 'delivered',
          })
        }
        break
      }
      case 'email.sent': {
        await this.repos.webhookDelivery.createEmailLog({
          tenant_id: body.tenant_id as string,
          to_email: data.to_email as string | undefined,
          template_name: data.template_name as string | undefined,
          subject: data.subject as string | undefined,
          provider_id: data.provider_id as string | undefined,
          entity_type: data.entity_type as string | undefined,
          entity_id: data.entity_id as string | undefined,
        })
        break
      }
      case 'ai.match_completed': {
        const aiRequestId = data.ai_request_id as string | undefined
        const matchCount = data.match_count as number | undefined
        if (aiRequestId) {
          await this.ai.completeMatchCallback(aiRequestId, matchCount)
        }
        break
      }
      default:
        break
    }

    await this.markWebhookDeliveryProcessed('n8n', idempotencyKey)
    return { duplicate: false }
  }
}
