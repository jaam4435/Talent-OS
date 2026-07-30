import type { AiMessage } from '@/lib/ai/types'
import type {
  AgentConversationPolicy,
  AgentConversationState,
  AgentMessageRole,
  AgentMessageRow,
  AgentMessageSummary,
  AgentSessionRow,
} from '@/modules/agents/types'

export interface ConversationStore {
  listMessages(sessionId: string, tenantId: string, limit: number): Promise<AgentMessageRow[]>
  appendMessage(params: {
    tenantId: string
    sessionId: string
    agentId: AgentMessageRow['agent_id']
    role: AgentMessageRole
    content: string
    metadata?: Record<string, unknown>
  }): Promise<string>
  updateSessionContext(
    sessionId: string,
    tenantId: string,
    context: Record<string, unknown>
  ): Promise<void>
}

export function toMessageSummary(row: AgentMessageRow): AgentMessageSummary {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
    metadata: row.metadata,
  }
}

export function toAiHistory(messages: AgentMessageRow[]): AiMessage[] {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))
}

export function trimHistory(messages: AgentMessageRow[], policy: AgentConversationPolicy): AgentMessageRow[] {
  if (messages.length <= policy.maxHistoryMessages) return messages
  return messages.slice(-policy.maxHistoryMessages)
}

export function buildConversationState(
  session: AgentSessionRow,
  messages: AgentMessageRow[]
): AgentConversationState {
  const turnCount = typeof session.context.turnCount === 'number' ? session.context.turnCount : 0

  return {
    sessionId: session.id,
    agentId: session.agent_id,
    status: session.status,
    turnCount,
    entityType: session.entity_type,
    entityId: session.entity_id,
    correlationId: session.correlation_id,
    messages: messages.map(toMessageSummary),
    context: session.context,
  }
}

export class AgentConversationManager {
  constructor(private readonly store: ConversationStore) {}

  async loadHistory(
    sessionId: string,
    tenantId: string,
    policy: AgentConversationPolicy
  ): Promise<AgentMessageRow[]> {
    const messages = await this.store.listMessages(sessionId, tenantId, policy.maxHistoryMessages)
    return trimHistory(messages, policy)
  }

  async recordUserTurn(params: {
    tenantId: string
    sessionId: string
    agentId: AgentMessageRow['agent_id']
    content: string
    turnCount: number
  }): Promise<void> {
    await this.store.appendMessage({
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      agentId: params.agentId,
      role: 'user',
      content: params.content,
    })

    await this.store.updateSessionContext(params.sessionId, params.tenantId, {
      turnCount: params.turnCount + 1,
      lastUserMessageAt: new Date().toISOString(),
    })
  }

  async recordAssistantTurn(params: {
    tenantId: string
    sessionId: string
    agentId: AgentMessageRow['agent_id']
    content: string
    metadata?: Record<string, unknown>
  }): Promise<void> {
    await this.store.appendMessage({
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      agentId: params.agentId,
      role: 'assistant',
      content: params.content,
      metadata: params.metadata,
    })
  }

  async recordToolTurns(
    params: {
      tenantId: string
      sessionId: string
      agentId: AgentMessageRow['agent_id']
      toolCalls: Array<{ tool: string; result: unknown; isError: boolean }>
    },
    policy: AgentConversationPolicy
  ): Promise<void> {
    if (!policy.persistToolResults) return

    for (const call of params.toolCalls) {
      await this.store.appendMessage({
        tenantId: params.tenantId,
        sessionId: params.sessionId,
        agentId: params.agentId,
        role: 'tool',
        content: JSON.stringify({ tool: call.tool, result: call.result, isError: call.isError }),
        metadata: { tool: call.tool, isError: call.isError },
      })
    }
  }
}
