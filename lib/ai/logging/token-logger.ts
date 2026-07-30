import { createAdminClient } from '@/modules/core/utils/supabase/admin'
import { mapProviderToDb } from '@/lib/ai/config'
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
    const supabase = createAdminClient()
    const dbProvider = mapProviderToDb(input.provider) as DbAiProvider

    const { data, error } = await supabase
      .from('ai_requests')
      .insert({
        tenant_id: input.tenantId,
        correlation_id: input.correlationId ?? crypto.randomUUID(),
        provider: dbProvider,
        model: input.model,
        request_type: input.requestType,
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
        prompt_hash: input.promptHash ?? null,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error || !data) {
      throw new Error(`Failed to create AI request log: ${error?.message ?? 'unknown'}`)
    }

    return data.id as string
  }

  async log(entry: TokenLogEntry & { aiRequestId?: string }): Promise<string | undefined> {
    if (!entry.tenantId) return entry.aiRequestId

    const supabase = createAdminClient()

    if (entry.aiRequestId) {
      await supabase
        .from('ai_requests')
        .update({
          status: entry.status,
          input_tokens: entry.usage.inputTokens,
          output_tokens: entry.usage.outputTokens,
          estimated_cost: entry.usage.estimatedCost,
          duration_ms: entry.latencyMs,
          prompt_hash: entry.promptHash ?? undefined,
          error_message: entry.errorMessage ?? null,
          result: entry.result ?? null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', entry.aiRequestId)

      return entry.aiRequestId
    }

    const dbProvider = mapProviderToDb(entry.provider) as DbAiProvider

    const { data } = await supabase
      .from('ai_requests')
      .insert({
        tenant_id: entry.tenantId,
        correlation_id: entry.correlationId ?? crypto.randomUUID(),
        provider: dbProvider,
        model: entry.model,
        request_type: entry.requestType ?? 'digest',
        entity_type: entry.entityType ?? null,
        entity_id: entry.entityId ?? null,
        prompt_hash: entry.promptHash ?? null,
        status: entry.status,
        input_tokens: entry.usage.inputTokens,
        output_tokens: entry.usage.outputTokens,
        estimated_cost: entry.usage.estimatedCost,
        duration_ms: entry.latencyMs,
        error_message: entry.errorMessage ?? null,
        result: entry.result ?? null,
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    return data?.id as string | undefined
  }
}

export const globalTokenLogger = new TokenUsageLogger()
