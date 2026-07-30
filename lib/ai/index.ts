export { getAiGateway, resetAiGateway, AiGateway, callAiStructured, AiGuardrailError } from '@/lib/ai/gateway'

export type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiStructuredRequest,
  AiStructuredResponse,
  AiStreamChunk,
  AiGatewayOptions,
  AiFeature,
  AiMessage,
  ProviderId,
  PromptDefinition,
  ResolvedPrompt,
  JsonSchemaDefinition,
} from '@/lib/ai/types'

export {
  AiGatewayError,
  AiProviderError,
  AiRateLimitError,
  AiFeatureDisabledError,
  AiConfigurationError,
  AiStructuredParseError,
  isAiGatewayError,
  isRetryableAiError,
} from '@/lib/ai/errors'

export { loadGatewayConfig, getProviderApiKey, mapProviderToDb } from '@/lib/ai/config'

export { globalPromptManager, PromptManager, registerDefaultPrompts } from '@/lib/ai/prompt/manager'
export { completeWithPrompt } from '@/lib/ai/prompt/complete-with-prompt'
export { registerAgentPrompts } from '@/lib/ai/agent/instructions'
export {
  AGENT_DEFAULTS,
  getAgentDefault,
  listAgentDefaults,
  isValidAgentId,
  mergeAgentConfig,
  resolveAgentTools,
} from '@/lib/ai/agent'

export { globalTokenLogger, TokenUsageLogger } from '@/lib/ai/logging/token-logger'
export { globalCostTracker, CostTracker, estimateTokenCost } from '@/lib/ai/logging/cost-tracker'

export { withRetry } from '@/lib/ai/middleware/retry'
export { RateLimiter } from '@/lib/ai/middleware/rate-limit'
export { executeWithFallback, streamWithFallback } from '@/lib/ai/middleware/fallback'

export {
  assertFeatureEnabled,
  isFeatureEnabled,
  getFeatureFlags,
  isGatewayFeatureFlagEnabled,
} from '@/lib/ai/features/flags'

export { globalModelRouter, ModelRouter } from '@/lib/ai/router/model-router'
export type { ModelRouteInput, ModelRouteResult } from '@/lib/ai/router/model-router'

export { validateInput, validateOutput } from '@/lib/ai/guardrails'
export { isAiGuardrailError } from '@/lib/ai/guardrails/errors'

export { globalPlatformMemory, PlatformMemoryStore } from '@/lib/ai/memory'
export type { MemoryEntry, MemoryScope, MemoryWriteInput, MemoryReadInput } from '@/lib/ai/memory'

export {
  getProvider,
  getProviderRegistry,
  getConfiguredProviders,
  getProviderChain,
  OpenAiProvider,
  AnthropicProvider,
  GeminiProvider,
  OpenRouterProvider,
} from '@/lib/ai/providers'

export type { AiProviderInterface } from '@/lib/ai/providers/interface'

export { collectStream, createStreamResponse } from '@/lib/ai/streaming/handler'
