import { mapProviderToDb } from '@/lib/ai/config'
import { createAdminServices } from '@/lib/services/factory'
import type { AiFeature, AiUsageMetrics, DbAiProvider, ProviderId } from '@/lib/ai/types'

export interface TokenLogEntry {
  tenantId?: string
  correlationId?: string
  provider: ProviderId
  model: string
  requestType?: AiFeature
  entityType?: string
  entityId?: string
  promptHash?: string
  usage: AiUsageMetrics
  latencyMs: number
  status: 'completed' | 'failed'
  errorMessage?: string
  result?: Record<string, unknown>
}

export class TokenUsageLogger {
  async createPendingRequest(input: {
    tenantId: string
    correlationId?: string
    provider: ProviderId
    model: string
    requestType: AiFeature
    entityType?: string
    entityId?: string
    promptHash?: string
  }): Promise<string> {
    const services = await createAdminServices()
    const dbProvider = mapProviderToDb(input.provider) as DbAiProvider

    return services.ai.createAiRequest({
      tenantId: input.tenantId,
      correlationId: input.correlationId,
      provider: dbProvider,
      model: input.model,
      requestType: input.requestType,
      entityType: input.entityType,
      entityId: input.entityId,
      promptHash: input.promptHash,
    })
  }

  async log(entry: TokenLogEntry & { aiRequestId?: string }): Promise<string | undefined> {
    if (!entry.tenantId) return entry.aiRequestId

    const services = await createAdminServices()

    if (entry.aiRequestId) {
      await services.ai.updateAiRequest(entry.aiRequestId, {
        status: entry.status,
        inputTokens: entry.usage.inputTokens,
        outputTokens: entry.usage.outputTokens,
        estimatedCost: entry.usage.estimatedCost,
        durationMs: entry.latencyMs,
        promptHash: entry.promptHash,
        errorMessage: entry.errorMessage ?? null,
        result: entry.result ?? null,
      })

      return entry.aiRequestId
    }

    const dbProvider = mapProviderToDb(entry.provider) as DbAiProvider
    const id = await services.ai.createAiRequest({
      tenantId: entry.tenantId,
      correlationId: entry.correlationId,
      provider: dbProvider,
      model: entry.model,
      requestType: entry.requestType ?? 'digest',
      entityType: entry.entityType,
      entityId: entry.entityId,
      promptHash: entry.promptHash,
    })

    await services.ai.updateAiRequest(id, {
      status: entry.status,
      inputTokens: entry.usage.inputTokens,
      outputTokens: entry.usage.outputTokens,
      estimatedCost: entry.usage.estimatedCost,
      durationMs: entry.latencyMs,
      errorMessage: entry.errorMessage ?? null,
      result: entry.result ?? null,
    })

    return id
  }
}

export const globalTokenLogger = new TokenUsageLogger()
