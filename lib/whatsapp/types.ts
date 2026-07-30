/** WhatsApp first-class interface types. */

export type WhatsAppMessageType = 'text' | 'button' | 'interactive' | 'unknown'

export interface ParsedWhatsAppMessage {
  waMessageId: string
  phone: string
  phoneNumberId: string
  body: string
  messageType: WhatsAppMessageType
  timestamp?: string
  buttonPayload?: string
}

export interface DeliveryStatusUpdate {
  waMessageId: string
  status: string
}

export type WhatsAppIntent =
  | 'opportunity.interested'
  | 'opportunity.declined'
  | 'milestone.submit'
  | 'milestone.start'
  | 'project.status'
  | 'opt_out'
  | 'help'
  | 'agent.query'
  | 'unknown'

export interface DetectedIntent {
  intent: WhatsAppIntent
  confidence: number
  entities: Record<string, string>
  rawBody: string
}

export interface ConversationContext {
  tenantId: string
  freelancerId: string
  phone: string
  activeIntent: WhatsAppIntent | null
  activeEntityType: string | null
  activeEntityId: string | null
  context: Record<string, unknown>
  lastMessageAt: string
}

export type WhatsAppHandlerResult =
  | {
      handled: true
      intent: WhatsAppIntent
      workflowEvent?: string
      data: Record<string, unknown>
    }
  | {
      handled: false
      intent: WhatsAppIntent
      reason: string
    }

export interface InboundProcessResult {
  waMessageId: string
  tenantId?: string
  freelancerId?: string
  intent?: WhatsAppIntent
  handler: WhatsAppHandlerResult
}
