export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'openrouter'

/** Maps to `ai_requests.provider` column (`openai` | `claude`). */
export type DbAiProvider = 'openai' | 'claude'

export type AiFeature =
  | 'talent_match'
  | 'brief_parse'
  | 'project_summary'
  | 'shortlist_summary'
  | 'status_assessment'
  | 'digest'

export interface AiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface JsonSchemaDefinition {
  name: string
  strict?: boolean
  schema: Record<string, unknown>
}

export interface AiCompletionRequest {
  messages: AiMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  tenantId?: string
  feature?: AiFeature
  correlationId?: string
  entityType?: string
  entityId?: string
  promptId?: string
  promptVersion?: string
  provider?: ProviderId
  metadata?: Record<string, unknown>
  /** Inject platform memory into the request. */
  memory?: {
    tenantId?: string
    sessionId?: string
    entityType?: string
    entityId?: string
    scope?: import('@/lib/ai/memory/platform-memory').MemoryScope
    limit?: number
  }
  tenantTier?: 'starter' | 'pro' | 'enterprise'
}

export interface AiStructuredRequest<T = unknown> extends AiCompletionRequest {
  schema: JsonSchemaDefinition
  parse?: (raw: unknown) => T
}

export interface AiUsageMetrics {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost: number
}

export interface AiCompletionResponse {
  content: string
  provider: ProviderId
  model: string
  usage: AiUsageMetrics
  promptHash: string
  promptId?: string
  promptVersion?: string
  latencyMs: number
  usedFallback: boolean
  aiRequestId?: string
}

export interface AiStructuredResponse<T> extends AiCompletionResponse {
  data: T
}

export interface AiStreamChunk {
  content: string
  done: boolean
  provider: ProviderId
  model: string
  usage?: Partial<AiUsageMetrics>
}

export interface AiGatewayOptions {
  primaryProvider?: ProviderId
  fallbackProviders?: ProviderId[]
  maxRetries?: number
  retryBaseDelayMs?: number
  rateLimitRpm?: number
  enableStreaming?: boolean
  enableCostTracking?: boolean
  enableTokenLogging?: boolean
}

export interface PromptDefinition {
  id: string
  version: string
  system: string
  description?: string
  active?: boolean
}

export interface ResolvedPrompt {
  id: string
  version: string
  system: string
  promptHash: string
}

export interface ProviderCompletionParams {
  messages: AiMessage[]
  model: string
  temperature: number
  maxTokens?: number
  schema?: JsonSchemaDefinition
  stream?: boolean
}

export interface ProviderCompletionResult {
  content: string
  model: string
  inputTokens: number
  outputTokens: number
  raw?: unknown
}

export interface RateLimitState {
  remaining: number
  resetAt: Date
  limited: boolean
}
