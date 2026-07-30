import { getAiGateway } from '@/lib/ai'
import { getMcpGateway } from '@/lib/mcp/gateway'
import { AgentReasoningEngine } from '@/lib/ai/agent/reasoning'
import { AgentConversationManager, toAiHistory, type ConversationStore } from '@/lib/ai/agent/conversation'
import type { AgentRunContext, AgentRunResult } from '@/modules/agents/types'
import type { UserRole } from '@/modules/core/types/enums'

export class AgentExecutor {
  private readonly reasoning: AgentReasoningEngine
  private readonly conversation: AgentConversationManager

  constructor(private readonly store: ConversationStore) {
    this.reasoning = new AgentReasoningEngine(getAiGateway(), getMcpGateway())
    this.conversation = new AgentConversationManager(store)
  }

  async execute(params: {
    context: AgentRunContext
    userMessage: string
    tenantId: string
    userId: string
    role: UserRole
    turnCount: number
  }): Promise<AgentRunResult> {
    const { context, userMessage, tenantId, userId, role, turnCount } = params

    await this.conversation.recordUserTurn({
      tenantId,
      sessionId: context.sessionId,
      agentId: context.agentId,
      content: userMessage,
      turnCount,
    })

    const history = toAiHistory(context.conversationMessages)

    const result = await this.reasoning.run({
      context,
      userMessage,
      history,
      tenantId,
      userId,
      role,
      policy: context.reasoningPolicy,
    })

    if (result.toolCalls.length > 0) {
      await this.conversation.recordToolTurns(
        {
          tenantId,
          sessionId: context.sessionId,
          agentId: context.agentId,
          toolCalls: result.toolCalls,
        },
        context.conversationPolicy
      )
    }

    await this.conversation.recordAssistantTurn({
      tenantId,
      sessionId: context.sessionId,
      agentId: context.agentId,
      content: result.content,
      metadata: {
        steps: result.steps,
        toolCallCount: result.toolCalls.length,
      },
    })

    return {
      agentId: context.agentId,
      sessionId: context.sessionId,
      correlationId: context.correlationId,
      content: result.content,
      steps: result.steps,
      toolCalls: result.toolCalls,
      usage: result.usage,
    }
  }
}
