import { normalizePhone } from '@/lib/whatsapp/phone'
import type { DeliveryStatusUpdate, ParsedWhatsAppMessage, WhatsAppMessageType } from '@/lib/whatsapp/types'

export { normalizePhone }

interface MetaMessage {
  from: string
  id: string
  timestamp?: string
  type?: string
  text?: { body?: string }
  button?: { text?: string; payload?: string }
  interactive?: {
    type?: string
    button_reply?: { id?: string; title?: string }
    list_reply?: { id?: string; title?: string }
  }
}

interface MetaWebhookBody {
  entry?: Array<{
    changes?: Array<{
      field?: string
      value?: {
        metadata?: { phone_number_id?: string }
        messages?: MetaMessage[]
        statuses?: Array<{
          id: string
          status: string
        }>
      }
    }>
  }>
}

function extractBody(message: MetaMessage): {
  body: string
  messageType: WhatsAppMessageType
  buttonPayload?: string
} {
  if (message.type === 'text' && message.text?.body) {
    return { body: message.text.body, messageType: 'text' }
  }

  if (message.type === 'button' && message.button) {
    return {
      body: message.button.text ?? message.button.payload ?? '',
      messageType: 'button',
      buttonPayload: message.button.payload,
    }
  }

  if (message.type === 'interactive' && message.interactive) {
    const reply = message.interactive.button_reply ?? message.interactive.list_reply
    return {
      body: reply?.title ?? reply?.id ?? '',
      messageType: 'interactive',
      buttonPayload: reply?.id,
    }
  }

  return { body: '', messageType: 'unknown' }
}

/** Parse Meta Cloud API webhook payload into normalized messages and statuses. */
export function parseMetaWebhook(body: MetaWebhookBody): {
  inbound: ParsedWhatsAppMessage[]
  statuses: DeliveryStatusUpdate[]
} {
  const inbound: ParsedWhatsAppMessage[] = []
  const statuses: DeliveryStatusUpdate[] = []

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue
      const value = change.value
      const phoneNumberId = value?.metadata?.phone_number_id ?? ''

      for (const message of value?.messages ?? []) {
        const extracted = extractBody(message)
        if (!extracted.body && extracted.messageType === 'unknown') continue

        inbound.push({
          waMessageId: message.id,
          phone: normalizePhone(message.from),
          phoneNumberId,
          body: extracted.body,
          messageType: extracted.messageType,
          timestamp: message.timestamp,
          buttonPayload: extracted.buttonPayload,
        })
      }

      for (const status of value?.statuses ?? []) {
        statuses.push({ waMessageId: status.id, status: status.status })
      }
    }
  }

  return { inbound, statuses }
}

/** Normalize free-text or button payload into a comparable token. */
export function normalizeMessageBody(body: string): string {
  return body.trim().toUpperCase().replace(/\s+/g, ' ')
}
