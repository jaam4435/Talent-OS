import type { AgentReasoningPolicy, AgentConversationPolicy } from '@/modules/agents/types'

/** Shared default reasoning policy — overridable per tenant. */
export const DEFAULT_REASONING_POLICY: AgentReasoningPolicy = {
  maxSteps: 5,
  toolUseEnabled: true,
  temperature: 0.3,
  maxTokens: 4096,
}

/** Shared default conversation policy — overridable per tenant. */
export const DEFAULT_CONVERSATION_POLICY: AgentConversationPolicy = {
  maxHistoryMessages: 50,
  persistToolResults: true,
  autoSummarize: false,
}
