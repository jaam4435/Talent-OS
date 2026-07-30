export { getAiGateway, resetAiGateway, AiGateway, callAiStructured } from '@/lib/ai/gateway'

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
