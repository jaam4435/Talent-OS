import { hashPayload } from '@/lib/integrations/encryption'
import { loadGatewayConfig } from '@/lib/ai/config'
import {
  AiConfigurationError,
  AiStructuredParseError,
} from '@/lib/ai/errors'
import { AiGuardrailError } from '@/lib/ai/guardrails/errors'
import { validateInput, validateOutput } from '@/lib/ai/guardrails'
import { assertFeatureEnabled, isGatewayFeatureFlagEnabled } from '@/lib/ai/features/flags'
import { globalCostTracker } from '@/lib/ai/logging/cost-tracker'
import { globalTokenLogger } from '@/lib/ai/logging/token-logger'
import { globalPlatformMemory } from '@/lib/ai/memory/platform-memory'
import { executeWithFallback, streamWithFallback } from '@/lib/ai/middleware/fallback'
import { RateLimiter } from '@/lib/ai/middleware/rate-limit'
import { withRetry } from '@/lib/ai/middleware/retry'
import { globalPromptManager, registerDefaultPrompts } from '@/lib/ai/prompt/manager'
import { registerAgentPrompts } from '@/lib/ai/agent/instructions'
import { globalModelRouter } from '@/lib/ai/router/model-router'
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

  get modelRouter() {
    return globalModelRouter
  }

  get memory() {
    return globalPlatformMemory
  }

  get costTracker() {
    return globalCostTracker
  }

  /** Generate a text embedding vector (OpenAI text-embedding-3-small, 1536-dim). */
  async embed(text: string): Promise<number[]> {
    const { embedText } = await import('@/lib/ai/embeddings')
    const result = await embedText(text)
    return result.embedding
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
    const prepared = this.prepareRequest(request)

    if (!this.config.enableStreaming || !isGatewayFeatureFlagEnabled('streaming')) {
      const result = await this.complete(prepared)
      yield {
        content: result.content,
        done: true,
        provider: result.provider,
        model: result.model,
        usage: result.usage,
      }
      return
    }

    if (prepared.tenantId && prepared.feature) {
      await assertFeatureEnabled(prepared.tenantId, prepared.feature)
    }

    const rateLimitKey = prepared.tenantId ?? 'global'
    this.rateLimiter.consume(rateLimitKey)

    const providers = this.resolveProviderChain(prepared)
    const params = this.toProviderParams(prepared)
    const startedAt = Date.now()
    let content = ''
    let activeProvider = this.config.primaryProvider

    for await (const chunk of streamWithFallback(providers, params, (from, to, error) => {
      activeProvider = to
      console.warn(`[AiGateway] Streaming fallback ${from} → ${to}:`, error)
    })) {
      content += chunk
      yield {
        content: chunk,
        done: false,
        provider: activeProvider,
        model: params.model,
      }
    }

    const validated = validateOutput(content)
    const usage = {
      inputTokens: 0,
      outputTokens: Math.ceil(validated.length / 4),
      totalTokens: Math.ceil(validated.length / 4),
      estimatedCost: estimateTokenCost(activeProvider, params.model, 0, Math.ceil(validated.length / 4)),
    }

    yield {
      content: '',
      done: true,
      provider: activeProvider,
      model: params.model,
      usage,
    }

    if (this.config.enableTokenLogging && prepared.tenantId) {
      await globalTokenLogger.log({
        tenantId: prepared.tenantId,
        correlationId: prepared.correlationId,
        provider: activeProvider,
        model: params.model,
        requestType: prepared.feature,
        entityType: prepared.entityType,
        entityId: prepared.entityId,
        promptHash: this.buildPromptHash(prepared),
        usage,
        latencyMs: Date.now() - startedAt,
        status: 'completed',
      })
    }
  }

  private prepareRequest(request: AiCompletionRequest): AiCompletionRequest {
    const guardrail = validateInput(request)
    let messages = guardrail.messages

    if (request.memory) {
      const memoryEntries = globalPlatformMemory.read({
        tenantId: request.memory.tenantId ?? request.tenantId,
        sessionId: request.memory.sessionId,
        entityType: request.memory.entityType,
        entityId: request.memory.entityId,
        scope: request.memory.scope,
        limit: request.memory.limit,
      })
      const memoryMessages = globalPlatformMemory.toMessages(memoryEntries)
      messages = [...memoryMessages, ...messages]
    }

    if (guardrail.warnings.length) {
      console.warn('[AiGateway] Guardrail warnings:', guardrail.warnings)
    }

    return { ...request, messages }
  }

  private async execute(
    request: AiCompletionRequest,
    structured: boolean,
    schema?: AiStructuredRequest['schema']
  ): Promise<AiCompletionResponse> {
    const prepared = this.prepareRequest(request)

    if (prepared.tenantId && prepared.feature) {
      await assertFeatureEnabled(prepared.tenantId, prepared.feature)
    }

    const rateLimitKey = prepared.tenantId ?? 'global'
    this.rateLimiter.consume(rateLimitKey)

    const providers = this.resolveProviderChain(prepared)
    if (!providers.some((provider) => provider.isConfigured())) {
      throw new AiConfigurationError('No AI providers are configured')
    }

    const params = this.toProviderParams(prepared, schema)
    const startedAt = Date.now()
    const promptHash = this.buildPromptHash(prepared)
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

    const validatedContent = validateOutput(providerResult.content)

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
        tenantId: prepared.tenantId,
        feature: prepared.feature,
      })
    }

    let aiRequestId: string | undefined
    if (this.config.enableTokenLogging && prepared.tenantId && prepared.feature) {
      aiRequestId = await globalTokenLogger.log({
        tenantId: prepared.tenantId,
        correlationId: prepared.correlationId,
        provider: providerResult.provider,
        model: providerResult.model,
        requestType: prepared.feature,
        entityType: prepared.entityType,
        entityId: prepared.entityId,
        promptHash,
        usage,
        latencyMs: Date.now() - startedAt,
        status: 'completed',
      })
    }

    return {
      content: validatedContent,
      provider: providerResult.provider,
      model: providerResult.model,
      usage,
      promptHash,
      promptId: prepared.promptId,
      promptVersion: prepared.promptVersion,
      latencyMs: Date.now() - startedAt,
      usedFallback,
      aiRequestId,
    }
  }

  private resolveProviderChain(request?: AiCompletionRequest): AiProviderInterface[] {
    const routed = globalModelRouter.resolveProviderChain(
      {
        feature: request?.feature,
        provider: request?.provider ?? this.config.primaryProvider,
        model: request?.model,
        structured: Boolean(request?.metadata?.structured),
        tenantTier: request?.tenantTier,
      },
      this.config.fallbackProviders
    )
    return getProviderChain(routed.primary, routed.fallbacks)
  }

  private toProviderParams(
    request: AiCompletionRequest,
    schema?: AiStructuredRequest['schema']
  ): ProviderCompletionParams {
    const routed = globalModelRouter.route({
      feature: request.feature,
      provider: request.provider ?? this.config.primaryProvider,
      model: request.model,
      structured: Boolean(schema),
      tenantTier: request.tenantTier,
    })

    const chain = getProviderChain(routed.provider, this.config.fallbackProviders)
    const active = chain.find((entry) => entry.isConfigured()) ?? chain[0]
    const model = request.model ?? routed.model ?? active?.getDefaultModel() ?? this.config.models[routed.provider]

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

/** Convenience wrapper used by integration code — all LLM calls must use this or AiGateway directly. */
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
  model?: string
  correlationId?: string
  entityType?: string
  entityId?: string
  memory?: AiCompletionRequest['memory']
}): Promise<{
  data: T
  model: string
  provider: AiCompletionResponse['provider']
  inputTokens: number
  outputTokens: number
  estimatedCost: number
  promptHash: string
  usedFallback: boolean
  aiRequestId?: string
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
    model: input.model,
    correlationId: input.correlationId,
    entityType: input.entityType,
    entityId: input.entityId,
    memory: input.memory,
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
    aiRequestId: response.aiRequestId,
  }
}

export { AiGuardrailError }
