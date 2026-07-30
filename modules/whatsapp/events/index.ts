/** Canonical whatsapp domain event type strings. */
export const WhatsappEvents = {
  INBOUND_MESSAGE: 'whatsapp.inbound_message',
  STATUS_UPDATE: 'whatsapp.status_update',
} as const

export type WhatsappEventType = (typeof WhatsappEvents)[keyof typeof WhatsappEvents]
