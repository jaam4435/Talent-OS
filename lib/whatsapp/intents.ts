import { normalizeMessageBody } from '@/lib/whatsapp/parser'
import type { ConversationContext, DetectedIntent, WhatsAppIntent } from '@/lib/whatsapp/types'

const KEYWORD_INTENTS: Array<{ intent: WhatsAppIntent; keywords: string[]; confidence: number }> = [
  { intent: 'opportunity.interested', keywords: ['YES', 'Y', 'INTERESTED', 'OK', 'ACCEPT'], confidence: 0.95 },
  { intent: 'opportunity.declined', keywords: ['NO', 'N', 'DECLINE', 'DECLINED', 'PASS'], confidence: 0.95 },
  { intent: 'milestone.submit', keywords: ['SUBMIT', 'DONE', 'COMPLETE', 'FINISHED', 'DELIVERED'], confidence: 0.9 },
  { intent: 'milestone.start', keywords: ['START', 'BEGIN', 'IN PROGRESS', 'WORKING'], confidence: 0.85 },
  { intent: 'project.status', keywords: ['STATUS', 'UPDATE', 'PROGRESS', 'PROJECT'], confidence: 0.85 },
  { intent: 'project.accept', keywords: ['ACCEPT PROJECT', 'ACCEPT'], confidence: 0.88 },
  { intent: 'opportunity.list', keywords: ['OPPORTUNITIES', 'OPPORTUNITY', 'INVITES', 'GIGS'], confidence: 0.9 },
  { intent: 'payment.status', keywords: ['PAYMENTS', 'PAYMENT', 'PAY'], confidence: 0.88 },
  { intent: 'notification.list', keywords: ['NOTIFICATIONS', 'NOTIFICATION', 'ALERTS', 'ALERT'], confidence: 0.88 },
  { intent: 'approval.list', keywords: ['APPROVALS', 'APPROVAL', 'PENDING APPROVALS'], confidence: 0.9 },
  { intent: 'availability.available', keywords: ['AVAILABLE', 'FREE'], confidence: 0.9 },
  { intent: 'availability.busy', keywords: ['BUSY'], confidence: 0.9 },
  { intent: 'availability.unavailable', keywords: ['UNAVAILABLE', 'AWAY'], confidence: 0.9 },
  { intent: 'opt_out', keywords: ['STOP', 'UNSUBSCRIBE', 'OPT OUT', 'OPTOUT'], confidence: 0.99 },
  { intent: 'help', keywords: ['HELP', 'MENU', 'OPTIONS', '?'], confidence: 0.9 },
]

const APPROVAL_CONTEXT_INTENTS: Array<{ intent: WhatsAppIntent; keywords: string[] }> = [
  { intent: 'approval.approve', keywords: ['APPROVE', 'APPROVED', 'YES'] },
  { intent: 'approval.reject', keywords: ['REJECT', 'REJECTED', 'NO', 'DENY'] },
  { intent: 'milestone.review_approve', keywords: ['APPROVE MILESTONE', 'APPROVE'] },
  { intent: 'milestone.review_revision', keywords: ['REVISE', 'REVISION', 'REQUEST REVISION'] },
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

function detectApprovalContextIntent(
  token: string,
  context: ConversationContext | null
): DetectedIntent | null {
  if (!context?.activeEntityType) return null

  if (context.activeEntityType === 'approval_request') {
    for (const rule of APPROVAL_CONTEXT_INTENTS) {
      if (rule.intent.startsWith('milestone.')) continue
      if (rule.keywords.includes(token)) {
        return {
          intent: rule.intent,
          confidence: 0.92,
          entities: { entity_id: context.activeEntityId ?? '' },
          rawBody: '',
        }
      }
    }
  }

  if (context.activeEntityType === 'milestone' && context.activeIntent === 'milestone.review_approve') {
    for (const rule of APPROVAL_CONTEXT_INTENTS.filter((r) => r.intent.startsWith('milestone.'))) {
      if (rule.keywords.includes(token)) {
        return {
          intent: rule.intent,
          confidence: 0.92,
          entities: { entity_id: context.activeEntityId ?? '' },
          rawBody: '',
        }
      }
    }
  }

  return null
}

/** Rule-based intent detection with conversation context and approval pinning. */
export function detectIntent(
  body: string,
  context: ConversationContext | null,
  buttonPayload?: string
): DetectedIntent {
  const token = normalizeMessageBody(buttonPayload ?? body)

  const approvalIntent = detectApprovalContextIntent(token, context)
  if (approvalIntent) {
    approvalIntent.rawBody = body
    return approvalIntent
  }

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

export function availabilityForIntent(
  intent: WhatsAppIntent
): 'available' | 'busy' | 'unavailable' | null {
  if (intent === 'availability.available') return 'available'
  if (intent === 'availability.busy') return 'busy'
  if (intent === 'availability.unavailable') return 'unavailable'
  return null
}
