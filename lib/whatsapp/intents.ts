import { normalizeMessageBody } from '@/lib/whatsapp/parser'
import type { ConversationContext, DetectedIntent, WhatsAppIntent } from '@/lib/whatsapp/types'

const KEYWORD_INTENTS: Array<{ intent: WhatsAppIntent; keywords: string[]; confidence: number }> = [
  { intent: 'opportunity.interested', keywords: ['YES', 'Y', 'INTERESTED', 'OK', 'ACCEPT'], confidence: 0.95 },
  { intent: 'opportunity.declined', keywords: ['NO', 'N', 'DECLINE', 'DECLINED', 'PASS'], confidence: 0.95 },
  { intent: 'milestone.submit', keywords: ['SUBMIT', 'DONE', 'COMPLETE', 'FINISHED', 'DELIVERED'], confidence: 0.9 },
  { intent: 'milestone.start', keywords: ['START', 'BEGIN', 'IN PROGRESS', 'WORKING'], confidence: 0.85 },
  { intent: 'milestone.approve', keywords: ['APPROVE', 'APPROVED', 'LGTM'], confidence: 0.9 },
  { intent: 'milestone.revision', keywords: ['REVISION', 'REVISE', 'CHANGES', 'REWORK'], confidence: 0.88 },
  { intent: 'project.status', keywords: ['STATUS', 'UPDATE', 'PROGRESS', 'PROJECT'], confidence: 0.85 },
  { intent: 'project.approve', keywords: ['APPROVE PROJECT', 'PROJECT APPROVE'], confidence: 0.9 },
  { intent: 'assignment.accept', keywords: ['ACCEPT ASSIGNMENT', 'TAKE IT', 'CONFIRM ASSIGNMENT'], confidence: 0.92 },
  { intent: 'assignment.reject', keywords: ['REJECT ASSIGNMENT', 'DECLINE ASSIGNMENT', 'PASS ASSIGNMENT'], confidence: 0.92 },
  { intent: 'deliverable.submit', keywords: ['SEND DELIVERABLE', 'DELIVER', 'UPLOAD'], confidence: 0.88 },
  { intent: 'approval.approve', keywords: ['APPROVE REQUEST', 'APPROVE GATE'], confidence: 0.9 },
  { intent: 'approval.reject', keywords: ['REJECT REQUEST', 'DENY REQUEST'], confidence: 0.9 },
  { intent: 'opt_out', keywords: ['STOP', 'UNSUBSCRIBE', 'OPT OUT', 'OPTOUT'], confidence: 0.99 },
  { intent: 'help', keywords: ['HELP', 'MENU', 'OPTIONS', '?'], confidence: 0.9 },
]

const ENTITY_INTENT_MAP: Record<string, WhatsAppIntent> = {
  opportunity: 'opportunity.interested',
  project: 'project.approve',
  allocation: 'assignment.accept',
  assignment: 'assignment.accept',
  milestone: 'milestone.approve',
  deliverable: 'deliverable.submit',
  approval_request: 'approval.approve',
}

function intentFromContext(context: ConversationContext | null, body: string): DetectedIntent | null {
  if (!context) return null

  const token = normalizeMessageBody(body)
  if (context.activeEntityType === 'opportunity') {
    if (['YES', 'Y', 'INTERESTED', 'OK', 'ACCEPT'].includes(token)) {
      return contextualIntent(context, 'opportunity.interested', 0.85, body)
    }
    if (['NO', 'N', 'DECLINE', 'PASS'].includes(token)) {
      return contextualIntent(context, 'opportunity.declined', 0.85, body)
    }
  }

  if (context.activeEntityType && context.activeEntityId) {
    const mapped = ENTITY_INTENT_MAP[context.activeEntityType]
    if (mapped && ['YES', 'OK', 'ACCEPT', 'APPROVE'].includes(token)) {
      return contextualIntent(context, mapped, 0.8, body)
    }
    if (['NO', 'REJECT', 'DECLINE', 'DENY'].includes(token)) {
      if (context.activeEntityType === 'allocation' || context.activeEntityType === 'assignment') {
        return contextualIntent(context, 'assignment.reject', 0.8, body)
      }
      if (context.activeEntityType === 'approval_request') {
        return contextualIntent(context, 'approval.reject', 0.8, body)
      }
    }
  }

  if (!context.activeIntent || context.activeIntent === 'unknown') return null

  return {
    intent: context.activeIntent,
    confidence: 0.7,
    entities: {
      entity_type: context.activeEntityType ?? '',
      entity_id: context.activeEntityId ?? '',
    },
    rawBody: body,
  }
}

function contextualIntent(
  context: ConversationContext,
  intent: WhatsAppIntent,
  confidence: number,
  body: string
): DetectedIntent {
  return {
    intent,
    confidence,
    entities: {
      entity_type: context.activeEntityType ?? '',
      entity_id: context.activeEntityId ?? '',
    },
    rawBody: body,
  }
}

/** Rule-based intent detection with conversation context and entity boost. */
export function detectIntent(
  body: string,
  context: ConversationContext | null,
  buttonPayload?: string
): DetectedIntent {
  const token = normalizeMessageBody(buttonPayload ?? body)

  const contextual = intentFromContext(context, body)
  if (contextual && ['YES', 'Y', 'NO', 'N', 'OK', 'ACCEPT', 'APPROVE', 'REJECT', 'DECLINE', 'DENY'].includes(token)) {
    return contextual
  }

  for (const rule of KEYWORD_INTENTS) {
    if (rule.keywords.includes(token)) {
      return {
        intent: rule.intent,
        confidence: rule.confidence,
        entities: context?.activeEntityId
          ? {
              entity_type: context.activeEntityType ?? '',
              entity_id: context.activeEntityId ?? '',
            }
          : {},
        rawBody: body,
      }
    }
  }

  if (contextual) return contextual

  if (body.trim().length >= 8) {
    return {
      intent: 'agent.query',
      confidence: 0.5,
      entities: {},
      rawBody: body,
    }
  }

  return {
    intent: 'unknown',
    confidence: 0.1,
    entities: {},
    rawBody: body,
  }
}

export function responseForOpportunityIntent(intent: WhatsAppIntent): 'interested' | 'declined' | null {
  if (intent === 'opportunity.interested') return 'interested'
  if (intent === 'opportunity.declined') return 'declined'
  return null
}

export function entityIdFromIntent(intent: DetectedIntent, conversation: ConversationContext): string | null {
  return intent.entities.entity_id || conversation.activeEntityId || null
}

export function entityTypeFromIntent(intent: DetectedIntent, conversation: ConversationContext): string | null {
  return intent.entities.entity_type || conversation.activeEntityType || null
}
