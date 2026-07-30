/** Conversation turn history persisted in whatsapp_conversations.context JSONB. */

export const CONVERSATION_MEMORY_KEYS = {
  turns: 'turns',
  pinnedApprovalId: 'pinned_approval_id',
  agentSessionId: 'agent_session_id',
  lastIntent: 'last_intent',
} as const

export interface ConversationTurn {
  role: 'user' | 'assistant' | 'system'
  content: string
  at: string
  intent?: string
}

const MAX_TURNS = 20

export function getRecentTurns(context: Record<string, unknown>, limit = 10): ConversationTurn[] {
  const turns = (context[CONVERSATION_MEMORY_KEYS.turns] as ConversationTurn[] | undefined) ?? []
  return turns.slice(-limit)
}

export function appendConversationTurn(
  context: Record<string, unknown>,
  turn: ConversationTurn
): Record<string, unknown> {
  const turns = [...getRecentTurns(context, MAX_TURNS), turn].slice(-MAX_TURNS)
  return {
    ...context,
    [CONVERSATION_MEMORY_KEYS.turns]: turns,
    ...(turn.intent ? { [CONVERSATION_MEMORY_KEYS.lastIntent]: turn.intent } : {}),
  }
}

export function getPinnedApprovalId(context: Record<string, unknown>): string | null {
  const id = context[CONVERSATION_MEMORY_KEYS.pinnedApprovalId]
  return typeof id === 'string' ? id : null
}

export function setPinnedApprovalId(
  context: Record<string, unknown>,
  approvalId: string | null
): Record<string, unknown> {
  if (!approvalId) {
    const next = { ...context }
    delete next[CONVERSATION_MEMORY_KEYS.pinnedApprovalId]
    return next
  }
  return { ...context, [CONVERSATION_MEMORY_KEYS.pinnedApprovalId]: approvalId }
}

export function getAgentSessionId(context: Record<string, unknown>): string | null {
  const id = context[CONVERSATION_MEMORY_KEYS.agentSessionId]
  return typeof id === 'string' ? id : null
}

export function setAgentSessionId(
  context: Record<string, unknown>,
  sessionId: string | null
): Record<string, unknown> {
  if (!sessionId) {
    const next = { ...context }
    delete next[CONVERSATION_MEMORY_KEYS.agentSessionId]
    return next
  }
  return { ...context, [CONVERSATION_MEMORY_KEYS.agentSessionId]: sessionId }
}

/** Format recent turns for AI prompt injection. */
export function formatTurnsForPrompt(turns: ConversationTurn[]): string {
  if (!turns.length) return ''
  return turns
    .map((t) => `${t.role === 'user' ? 'Freelancer' : 'Assistant'}: ${t.content}`)
    .join('\n')
}
