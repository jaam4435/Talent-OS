import { createAdminClient } from '@/modules/core/utils/supabase/admin'

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
  const supabase = createAdminClient()
  const { data } = await supabase
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

export async function findFreelancerByPhone(tenantId: string, phone: string) {
  const supabase = createAdminClient()
  const normalized = normalizePhone(phone)

  const { data } = await supabase
    .from('freelancers')
    .select('id, full_name, user_id, phone')
    .eq('tenant_id', tenantId)
    .or(`phone.eq.${normalized},phone.eq.${normalized.replace('+', '')}`)
    .limit(1)
    .maybeSingle()

  return data
}

export async function findPendingOpportunityRecipient(
  tenantId: string,
  freelancerId: string
) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('opportunity_recipients')
    .select('id, opportunity_id, response')
    .eq('tenant_id', tenantId)
    .eq('freelancer_id', freelancerId)
    .eq('response', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data
}

export async function processInboundQuickReply(input: {
  tenantId: string
  freelancerId: string
  freelancerName: string
  phone: string
  body: string
  waMessageId: string
}) {
  const supabase = createAdminClient()
  const response = parseQuickResponse(input.body)

  await supabase.from('whatsapp_messages').insert({
    tenant_id: input.tenantId,
    freelancer_id: input.freelancerId,
    direction: 'inbound',
    wa_message_id: input.waMessageId,
    phone: input.phone,
    body: input.body,
    status: 'received',
  })

  if (!response) {
    return { handled: false as const, reason: 'unrecognized_message' }
  }

  const recipient = await findPendingOpportunityRecipient(input.tenantId, input.freelancerId)
  if (!recipient) {
    return { handled: false as const, reason: 'no_pending_opportunity' }
  }

  await supabase
    .from('opportunity_recipients')
    .update({
      response,
      responded_at: new Date().toISOString(),
      response_note: `Via WhatsApp: ${input.body}`,
    })
    .eq('id', recipient.id)

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
  const supabase = createAdminClient()
  await supabase
    .from('whatsapp_messages')
    .update({ status })
    .eq('wa_message_id', waMessageId)

  if (status === 'delivered') {
    const { data: message } = await supabase
      .from('whatsapp_messages')
      .select('entity_id')
      .eq('wa_message_id', waMessageId)
      .maybeSingle()

    if (message?.entity_id) {
      await supabase
        .from('opportunity_recipients')
        .update({ whatsapp_delivered: true })
        .eq('id', message.entity_id)
    }
  }
}
