import { hashPayload } from '@/lib/integrations/encryption'
import { loadGatewayConfig } from '@/lib/ai/config'
import {
  AiConfigurationError,
  AiStructuredParseError,
} from '@/lib/ai/errors'
import { assertFeatureEnabled, isGatewayFeatureFlagEnabled } from '@/lib/ai/features/flags'
import { globalCostTracker, estimateTokenCost } from '@/lib/ai/logging/cost-tracker'
import { globalTokenLogger } from '@/lib/ai/logging/token-logger'
import { executeWithFallback } from '@/lib/ai/middleware/fallback'
import {
  assertCircuitClosed,
  recordCircuitFailure,
  recordCircuitSuccess,
} from '@/lib/ai/middleware/circuit-breaker'
import { RateLimiter } from '@/lib/ai/middleware/rate-limit'
import { withRetry } from '@/lib/ai/middleware/retry'
import { assertInputGuardrails } from '@/lib/ai/security/guardrails/input'
import { redactMessages } from '@/lib/ai/security/pii/redactor'
import { getProviderChain } from '@/lib/ai/providers'
import type { AiProviderInterface } from '@/lib/ai/providers/interface'
import { instrumentAiRequest } from '@/lib/observability/instrumentation'
import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiGatewayOptions,
  AiStructuredRequest,
  AiStructuredResponse,
  ProviderCompletionParams,
} from '@/lib/ai/types'
import type { PipelineExecuteResult } from '@/lib/ai/gateway/types'

import { globalPromptManager, registerDefaultPrompts } from '@/lib/ai/prompt/manager'
import { registerAgentPrompts } from '@/lib/ai/agent/instructions'
import { streamWithFallback } from '@/lib/ai/middleware/fallback'
import type { AiStreamChunk } from '@/lib/ai/types'

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
    return this.runPipeline(request, false).then((result) => result.response)
  }

  async completeStructured<T>(request: AiStructuredRequest<T>): Promise<AiStructuredResponse<T>> {
    const result = await this.runPipeline(request, true, request.schema)

    try {
      const data = request.parse
        ? request.parse(JSON.parse(result.response.content))
        : (JSON.parse(result.response.content) as T)

      return { ...result.response, data }
    } catch (error) {
      throw new AiStructuredParseError('Failed to parse structured AI response', error)
    }
  }

  private async runPipeline(
    request: AiCompletionRequest,
    structured: boolean,
    schema?: AiStructuredRequest['schema']
  ): Promise<PipelineExecuteResult> {
    if (request.tenantId && request.feature) {
      await assertFeatureEnabled(request.tenantId, request.feature)
    }

    const rateLimitKey = request.tenantId ?? 'global'
    await this.rateLimiter.consume(rateLimitKey)

    assertInputGuardrails(request.messages)
    const { messages } = redactMessages(request.messages)

    const providers = this.resolveProviderChain(request)
    if (!providers.some((provider) => provider.isConfigured())) {
      throw new AiConfigurationError('No AI providers are configured')
    }

    const params = this.toProviderParams({ ...request, messages }, schema)
    const startedAt = Date.now()
    const promptHash = this.buildPromptHash(request)
    const primaryProvider = request.provider ?? this.config.primaryProvider

    await assertCircuitClosed(primaryProvider)

    let usedFallback = false

    try {
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

      await recordCircuitSuccess(providerResult.provider)

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

      let aiRequestId: string | undefined = request.aiRequestId
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
          promptVersion: request.promptVersion,
          usage,
          latencyMs: Date.now() - startedAt,
          status: 'completed',
          aiRequestId: request.aiRequestId,
        })
      }

      instrumentAiRequest({
        feature: request.feature,
        durationMs: Date.now() - startedAt,
        cost: estimatedCost,
        status: 'completed',
        context: {
          tenantId: request.tenantId,
          correlationId: request.correlationId,
        },
      })

      const response: AiCompletionResponse = {
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

      return {
        response,
        providerResult: {
          provider: providerResult.provider,
          model: providerResult.model,
          inputTokens: providerResult.inputTokens,
          outputTokens: providerResult.outputTokens,
          content: providerResult.content,
        },
      }
    } catch (error) {
      await recordCircuitFailure(primaryProvider)
      await this.handleFailure(request, params, promptHash, startedAt, error)
      throw error
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

    await this.rateLimiter.consume(request.tenantId ?? 'global')

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
        promptHash: this.buildPromptHash(request),
        promptVersion: request.promptVersion,
        usage,
        latencyMs: Date.now() - startedAt,
        status: 'completed',
        aiRequestId: request.aiRequestId,
      })
    }
  }

  private async handleFailure(
    request: AiCompletionRequest,
    params: ProviderCompletionParams,
    promptHash: string,
    startedAt: number,
    error: unknown
  ) {
    const latencyMs = Date.now() - startedAt
    const message = error instanceof Error ? error.message : 'AI request failed'

    if (this.config.enableTokenLogging && request.tenantId && request.feature) {
      await globalTokenLogger.log({
        tenantId: request.tenantId,
        correlationId: request.correlationId,
        provider: request.provider ?? this.config.primaryProvider,
        model: params.model,
        requestType: request.feature,
        entityType: request.entityType,
        entityId: request.entityId,
        promptHash,
        promptVersion: request.promptVersion,
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          estimatedCost: 0,
        },
        latencyMs,
        status: 'failed',
        errorMessage: message,
        aiRequestId: request.aiRequestId,
      })
    }

    instrumentAiRequest({
      feature: request.feature,
      durationMs: latencyMs,
      cost: 0,
      status: 'failed',
      context: {
        tenantId: request.tenantId,
        correlationId: request.correlationId,
      },
      errorMessage: message,
    })
  }

  private resolveProviderChain(request?: AiCompletionRequest): AiProviderInterface[] {
    const primary = request?.provider ?? this.config.primaryProvider
    return getProviderChain(primary, this.config.fallbackProviders)
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

export function createGateway(options?: AiGatewayOptions): AiGateway {
  return new AiGateway(options)
}
