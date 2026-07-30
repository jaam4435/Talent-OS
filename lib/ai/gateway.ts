import { hashPayload } from '@/lib/integrations/encryption'
import { loadGatewayConfig } from '@/lib/ai/config'
import { AiConfigurationError, AiStructuredParseError } from '@/lib/ai/errors'
import { assertFeatureEnabled, isGatewayFeatureFlagEnabled } from '@/lib/ai/features/flags'
import { globalCostTracker } from '@/lib/ai/logging/cost-tracker'
import { globalTokenLogger } from '@/lib/ai/logging/token-logger'
import { executeWithFallback, streamWithFallback } from '@/lib/ai/middleware/fallback'
import { RateLimiter } from '@/lib/ai/middleware/rate-limit'
import { withRetry } from '@/lib/ai/middleware/retry'
import { globalPromptManager, registerDefaultPrompts } from '@/lib/ai/prompt/manager'
import { registerAgentPrompts } from '@/lib/ai/agent/instructions'
import { getProviderChain } from '@/lib/ai/providers'
import type { AiProviderInterface } from '@/lib/ai/providers/interface'
import { estimateTokenCost } from '@/lib/ai/logging/cost-tracker'
import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiGatewayOptions,
  AiStreamChunk,
  AiStructuredRequest,
  AiStructuredResponse,
  ProviderCompletionParams,
} from '@/lib/ai/types'

let gatewayInstance: AiGateway | null = null
let promptsRegistered = false

function ensurePromptsRegistered(): void {
  if (!promptsRegistered) {
    registerDefaultPrompts()
    registerAgentPrompts()
    promptsRegistered = true
  }
}

export class AiGateway {
  private readonly config: ReturnType<typeof loadGatewayConfig>
  private readonly rateLimiter: RateLimiter

  constructor(options?: AiGatewayOptions) {
    ensurePromptsRegistered()
    const loaded = loadGatewayConfig()
    this.config = { ...loaded, ...options }
    this.rateLimiter = new RateLimiter(this.config.rateLimitRpm)
  }

  get promptManager() {
    return globalPromptManager
  }

  isConfigured(): boolean {
    return this.resolveProviderChain(undefined).some((provider) => provider.isConfigured())
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    return this.execute(request, false)
  }

  async completeStructured<T>(request: AiStructuredRequest<T>): Promise<AiStructuredResponse<T>> {
    const response = await this.execute(request, true, request.schema)

    try {
      const data = request.parse
        ? request.parse(JSON.parse(response.content))
        : (JSON.parse(response.content) as T)

      return { ...response, data }
    } catch (error) {
      throw new AiStructuredParseError('Failed to parse structured AI response', error)
    }
  }

  async *stream(request: AiCompletionRequest): AsyncGenerator<AiStreamChunk> {
    if (!this.config.enableStreaming || !isGatewayFeatureFlagEnabled('streaming')) {
      const result = await this.complete(request)
      yield {
        content: result.content,
        done: true,
        provider: result.provider,
        model: result.model,
        usage: result.usage,
      }
      return
    }

    if (request.tenantId && request.feature) {
      await assertFeatureEnabled(request.tenantId, request.feature)
    }

    const rateLimitKey = request.tenantId ?? 'global'
    this.rateLimiter.consume(rateLimitKey)

    const providers = this.resolveProviderChain(request)
    const params = this.toProviderParams(request)
    const startedAt = Date.now()
    let content = ''

    for await (const chunk of streamWithFallback(providers, params, (from, to, error) => {
      console.warn(`[AiGateway] Streaming fallback ${from} → ${to}:`, error)
    })) {
      content += chunk
      yield {
        content: chunk,
        done: false,
        provider: this.config.primaryProvider,
        model: params.model,
      }
    }

    const promptHash = this.buildPromptHash(request)
    const usage = {
      inputTokens: 0,
      outputTokens: Math.ceil(content.length / 4),
      totalTokens: Math.ceil(content.length / 4),
      estimatedCost: 0,
    }

    yield {
      content: '',
      done: true,
      provider: this.config.primaryProvider,
      model: params.model,
      usage,
    }

    if (this.config.enableTokenLogging && request.tenantId) {
      await globalTokenLogger.log({
        tenantId: request.tenantId,
        correlationId: request.correlationId,
        provider: this.config.primaryProvider,
        model: params.model,
        requestType: request.feature,
        entityType: request.entityType,
        entityId: request.entityId,
        promptHash,
        usage,
        latencyMs: Date.now() - startedAt,
        status: 'completed',
      })
    }
  }

  private async execute(
    request: AiCompletionRequest,
    structured: boolean,
    schema?: AiStructuredRequest['schema']
  ): Promise<AiCompletionResponse> {
    if (request.tenantId && request.feature) {
      await assertFeatureEnabled(request.tenantId, request.feature)
    }

    const rateLimitKey = request.tenantId ?? 'global'
    this.rateLimiter.consume(rateLimitKey)

    const providers = this.resolveProviderChain(request)
    if (!providers.some((provider) => provider.isConfigured())) {
      throw new AiConfigurationError('No AI providers are configured')
    }

    const params = this.toProviderParams(request, schema)
    const startedAt = Date.now()
    const promptHash = this.buildPromptHash(request)
    let usedFallback = false

    const providerResult = await withRetry(
      () =>
        executeWithFallback(providers, params, (from, to) => {
          usedFallback = true
          console.warn(`[AiGateway] Provider fallback ${from} → ${to}`)
        }),
      {
        maxRetries: this.config.maxRetries,
        baseDelayMs: this.config.retryBaseDelayMs,
      }
    )

    const estimatedCost = this.config.enableCostTracking
      ? estimateTokenCost(
          providerResult.provider,
          providerResult.model,
          providerResult.inputTokens,
          providerResult.outputTokens
        )
      : 0

    const usage = {
      inputTokens: providerResult.inputTokens,
      outputTokens: providerResult.outputTokens,
      totalTokens: providerResult.inputTokens + providerResult.outputTokens,
      estimatedCost,
    }

    if (this.config.enableCostTracking) {
      globalCostTracker.record({
        provider: providerResult.provider,
        model: providerResult.model,
        inputTokens: providerResult.inputTokens,
        outputTokens: providerResult.outputTokens,
        tenantId: request.tenantId,
        feature: request.feature,
      })
    }

    let aiRequestId: string | undefined
    if (this.config.enableTokenLogging && request.tenantId && request.feature) {
      aiRequestId = await globalTokenLogger.log({
        tenantId: request.tenantId,
        correlationId: request.correlationId,
        provider: providerResult.provider,
        model: providerResult.model,
        requestType: request.feature,
        entityType: request.entityType,
        entityId: request.entityId,
        promptHash,
        usage,
        latencyMs: Date.now() - startedAt,
        status: 'completed',
      })
    }

    return {
      content: providerResult.content,
      provider: providerResult.provider,
      model: providerResult.model,
      usage,
      promptHash,
      promptId: request.promptId,
      promptVersion: request.promptVersion,
      latencyMs: Date.now() - startedAt,
      usedFallback,
      aiRequestId,
    }
  }

  private resolveProviderChain(request?: AiCompletionRequest): AiProviderInterface[] {
    const primary = request?.provider ?? this.config.primaryProvider
    const fallbacks = this.config.fallbackProviders
    return getProviderChain(primary, fallbacks)
  }

  private toProviderParams(
    request: AiCompletionRequest,
    schema?: AiStructuredRequest['schema']
  ): ProviderCompletionParams {
    const provider = request.provider ?? this.config.primaryProvider
    const chain = getProviderChain(provider, this.config.fallbackProviders)
    const active = chain.find((entry) => entry.isConfigured()) ?? chain[0]
    const model = request.model ?? active?.getDefaultModel() ?? this.config.models[provider]

    return {
      messages: request.messages,
      model,
      temperature: request.temperature ?? 0.2,
      maxTokens: request.maxTokens,
      schema,
    }
  }

  private buildPromptHash(request: AiCompletionRequest): string {
    return hashPayload({
      messages: request.messages,
      promptId: request.promptId,
      promptVersion: request.promptVersion,
    })
  }
}

export function getAiGateway(options?: AiGatewayOptions): AiGateway {
  if (!gatewayInstance) {
    gatewayInstance = new AiGateway(options)
  }
  return gatewayInstance
}

export function resetAiGateway(): void {
  gatewayInstance = null
  promptsRegistered = false
}

/** Convenience wrapper used by legacy integration code. */
export async function callAiStructured<T>(input: {
  system: string
  user: string
  schema: NonNullable<AiStructuredRequest['schema']>
  temperature?: number
  tenantId?: string
  feature?: AiCompletionRequest['feature']
  promptId?: string
  promptVersion?: string
  provider?: AiCompletionRequest['provider']
}): Promise<{
  data: T
  model: string
  provider: AiCompletionResponse['provider']
  inputTokens: number
  outputTokens: number
  estimatedCost: number
  promptHash: string
  usedFallback: boolean
}> {
  const gateway = getAiGateway()
  const response = await gateway.completeStructured<T>({
    messages: [
      { role: 'system', content: input.system },
      { role: 'user', content: input.user },
    ],
    schema: input.schema,
    temperature: input.temperature,
    tenantId: input.tenantId,
    feature: input.feature,
    promptId: input.promptId,
    promptVersion: input.promptVersion,
    provider: input.provider,
  })

  return {
    data: response.data,
    model: response.model,
    provider: response.provider,
    inputTokens: response.usage.inputTokens,
    outputTokens: response.usage.outputTokens,
    estimatedCost: response.usage.estimatedCost,
    promptHash: response.promptHash,
    usedFallback: response.usedFallback,
  }
}
