/** Canonical whatsapp application event type strings. */
export const WhatsappEvents = {
  INBOUND: 'whatsapp.inbound',
  INTENT_HANDLED: 'whatsapp.intent_handled',
  AGENT_REQUESTED: 'whatsapp.agent_requested',
  OPT_OUT: 'whatsapp.opt_out',
  UNRECOGNIZED: 'whatsapp.unrecognized',
  SEND_REQUESTED: 'whatsapp.send_requested',
} as const

export type WhatsappEventType = (typeof WhatsappEvents)[keyof typeof WhatsappEvents]
