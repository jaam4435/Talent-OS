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
  | 'opportunity.list'
  | 'milestone.submit'
  | 'milestone.start'
  | 'milestone.review_approve'
  | 'milestone.review_revision'
  | 'project.status'
  | 'project.accept'
  | 'availability.available'
  | 'availability.busy'
  | 'availability.unavailable'
  | 'payment.status'
  | 'notification.list'
  | 'approval.list'
  | 'approval.approve'
  | 'approval.reject'
  | 'approval.resolve'
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

export interface WhatsAppParticipant {
  freelancerId: string
  freelancerName: string
  userId: string | null
  phone: string
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

export interface IntentHandlerContext {
  tenantId: string
  freelancerId: string
  freelancerName: string
  userId: string | null
  intent: DetectedIntent
  conversation: ConversationContext
  waMessageId: string
}
