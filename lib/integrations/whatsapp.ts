import { createAdminServices } from '@/lib/services/factory'

export interface WhatsAppIntegrationConfig {
  phone_number_id: string
  business_account_id: string
  access_token: string
  verify_token?: string
}

export interface InboundWhatsAppMessage {
  waMessageId: string
  phone: string
  body: string
  phoneNumberId: string
  timestamp?: string
}

const QUICK_RESPONSES: Record<string, 'interested' | 'declined'> = {
  YES: 'interested',
  Y: 'interested',
  INTERESTED: 'interested',
  NO: 'declined',
  N: 'declined',
  DECLINE: 'declined',
  DECLINED: 'declined',
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('+') ? digits : `+${digits}`
}

export function parseQuickResponse(body: string): 'interested' | 'declined' | null {
  const normalized = body.trim().toUpperCase()
  return QUICK_RESPONSES[normalized] ?? null
}

export function parseMetaWebhook(body: {
  entry?: Array<{
    changes?: Array<{
      field?: string
      value?: {
        metadata?: { phone_number_id?: string }
        messages?: Array<{
          from: string
          id: string
          timestamp?: string
          text?: { body?: string }
          type?: string
        }>
        statuses?: Array<{
          id: string
          status: string
          recipient_id?: string
        }>
      }
    }>
  }>
}): {
  inbound: InboundWhatsAppMessage[]
  statuses: Array<{ waMessageId: string; status: string }>
} {
  const inbound: InboundWhatsAppMessage[] = []
  const statuses: Array<{ waMessageId: string; status: string }> = []

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue
      const value = change.value
      const phoneNumberId = value?.metadata?.phone_number_id ?? ''

      for (const message of value?.messages ?? []) {
        if (message.type === 'text' && message.text?.body) {
          inbound.push({
            waMessageId: message.id,
            phone: normalizePhone(message.from),
            body: message.text.body,
            phoneNumberId,
            timestamp: message.timestamp,
          })
        }
      }

      for (const status of value?.statuses ?? []) {
        statuses.push({ waMessageId: status.id, status: status.status })
      }
    }
  }

  return { inbound, statuses }
}

export async function resolveTenantByPhoneNumberId(
  phoneNumberId: string
): Promise<string | null> {
  const services = await createAdminServices()
  return services.integration.resolveTenantByWhatsAppPhoneNumberId(phoneNumberId)
}

export async function findFreelancerByPhone(tenantId: string, phone: string) {
  const services = await createAdminServices()
  return services.talent.findByPhone(tenantId, phone)
}

export async function findPendingOpportunityRecipient(
  tenantId: string,
  freelancerId: string
) {
  const services = await createAdminServices()
  return services.crm.findPendingRecipient(tenantId, freelancerId)
}

export async function processInboundQuickReply(input: {
  tenantId: string
  freelancerId: string
  freelancerName: string
  phone: string
  body: string
  waMessageId: string
}) {
  const services = await createAdminServices()
  const response = parseQuickResponse(input.body)

  await services.integration.createInboundWhatsApp({
    tenant_id: input.tenantId,
    freelancer_id: input.freelancerId,
    wa_message_id: input.waMessageId,
    phone: input.phone,
    body: input.body,
  })

  if (!response) {
    return { handled: false as const, reason: 'unrecognized_message' }
  }

  const recipient = await services.crm.findPendingRecipient(input.tenantId, input.freelancerId)
  if (!recipient) {
    return { handled: false as const, reason: 'no_pending_opportunity' }
  }

  await services.crm.updateRecipientResponse(recipient.id, {
    response,
    responded_at: new Date().toISOString(),
    response_note: `Via WhatsApp: ${input.body}`,
  })

  return {
    handled: true as const,
    response,
    opportunityId: recipient.opportunity_id,
    recipientId: recipient.id,
    freelancerName: input.freelancerName,
  }
}

export async function updateDeliveryStatus(
  waMessageId: string,
  status: string
) {
  const services = await createAdminServices()
  await services.integration.updateWhatsAppDeliveryStatus(waMessageId, status)
}
