import { normalizeMessageBody } from '@/lib/whatsapp/parser'
import type { ConversationContext, DetectedIntent, WhatsAppIntent } from '@/lib/whatsapp/types'

const KEYWORD_INTENTS: Array<{ intent: WhatsAppIntent; keywords: string[]; confidence: number }> = [
  { intent: 'opportunity.interested', keywords: ['YES', 'Y', 'INTERESTED', 'OK', 'ACCEPT'], confidence: 0.95 },
  { intent: 'opportunity.declined', keywords: ['NO', 'N', 'DECLINE', 'DECLINED', 'PASS'], confidence: 0.95 },
  { intent: 'milestone.submit', keywords: ['SUBMIT', 'DONE', 'COMPLETE', 'FINISHED', 'DELIVERED'], confidence: 0.9 },
  { intent: 'milestone.start', keywords: ['START', 'BEGIN', 'IN PROGRESS', 'WORKING'], confidence: 0.85 },
  { intent: 'project.status', keywords: ['STATUS', 'UPDATE', 'PROGRESS', 'PROJECT'], confidence: 0.85 },
  { intent: 'opt_out', keywords: ['STOP', 'UNSUBSCRIBE', 'OPT OUT', 'OPTOUT'], confidence: 0.99 },
  { intent: 'help', keywords: ['HELP', 'MENU', 'OPTIONS', '?'], confidence: 0.9 },
]

function intentFromContext(context: ConversationContext | null): DetectedIntent | null {
  if (!context?.activeIntent || context.activeIntent === 'unknown') return null

  return {
    intent: context.activeIntent,
    confidence: 0.7,
    entities: {
      entity_type: context.activeEntityType ?? '',
      entity_id: context.activeEntityId ?? '',
    },
    rawBody: '',
  }
}

/** Rule-based intent detection with optional conversation context boost. */
export function detectIntent(
  body: string,
  context: ConversationContext | null,
  buttonPayload?: string
): DetectedIntent {
  const token = normalizeMessageBody(buttonPayload ?? body)

  for (const rule of KEYWORD_INTENTS) {
    if (rule.keywords.includes(token)) {
      return {
        intent: rule.intent,
        confidence: rule.confidence,
        entities: {},
        rawBody: body,
      }
    }
  }

  const contextual = intentFromContext(context)
  if (contextual) {
    contextual.rawBody = body
    return contextual
  }

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
