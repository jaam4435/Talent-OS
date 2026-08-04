import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Tables, Json } from '@/modules/core/types/database'
import type { AiProvider, AiRequestType } from '@/lib/integrations/ai/types'

export type AiRequestRow = Tables<'ai_requests'>

export interface CreateAiRequestInput {
  tenantId: string
  correlationId?: string
  provider: AiProvider
  model: string
  requestType: AiRequestType | string
  entityType?: string
  entityId?: string
  promptHash?: string
  promptVersion?: string
  productId?: string
}

export interface UpdateAiRequestInput {
  status?: 'pending' | 'processing' | 'completed' | 'failed'
  result?: Record<string, unknown> | null
  errorMessage?: string | null
  inputTokens?: number
  outputTokens?: number
  estimatedCost?: number
  durationMs?: number
  promptHash?: string
  promptVersion?: string
}

export class AiRequestRepository extends BaseRepository {
  async create(input: CreateAiRequestInput): Promise<string> {
    const { data, error } = await this.ctx.supabase
      .from('ai_requests')
      .insert({
        tenant_id: input.tenantId,
        correlation_id: input.correlationId ?? crypto.randomUUID(),
        provider: input.provider,
        model: input.model,
        request_type: input.requestType,
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
        prompt_hash: input.promptHash ?? null,
        prompt_version: input.promptVersion ?? null,
        product_id: input.productId ?? 'talent_os',
        status: 'pending',
      })
      .select('id')
      .single()

    this.throwIfError(error)
    if (!data?.id) this.notFound('AI request')
    return data.id
  }

  async findById(aiRequestId: string): Promise<AiRequestRow | null> {
    const { data } = await this.ctx.supabase
      .from('ai_requests')
      .select('*')
      .eq('id', aiRequestId)
      .maybeSingle()
    return data ?? null
  }

  async findRequestType(aiRequestId: string): Promise<string | null> {
    const { data } = await this.ctx.supabase
      .from('ai_requests')
      .select('request_type')
      .eq('id', aiRequestId)
      .maybeSingle()
    return data?.request_type ?? null
  }

  async update(aiRequestId: string, patch: UpdateAiRequestInput): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('ai_requests')
      .update({
        status: patch.status,
        result: patch.result as Json | null | undefined,
        error_message: patch.errorMessage,
        input_tokens: patch.inputTokens,
        output_tokens: patch.outputTokens,
        estimated_cost: patch.estimatedCost,
        duration_ms: patch.durationMs,
        prompt_hash: patch.promptHash,
        prompt_version: patch.promptVersion,
        completed_at:
          patch.status === 'completed' || patch.status === 'failed'
            ? new Date().toISOString()
            : undefined,
      })
      .eq('id', aiRequestId)

    this.throwIfError(error)
  }

  async countMonthlyByTenant(tenantId: string, monthStart: Date): Promise<number> {
    const { count } = await this.ctx.supabase
      .from('ai_requests')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', monthStart.toISOString())
    return count ?? 0
  }

  async findLatestByEntity(input: {
    tenantId: string
    entityType: string
    entityId: string
    requestType: string
  }): Promise<Pick<AiRequestRow, 'id' | 'status' | 'created_at' | 'completed_at' | 'result'> | null> {
    const { data } = await this.ctx.supabase
      .from('ai_requests')
      .select('id, status, created_at, completed_at, result')
      .eq('tenant_id', input.tenantId)
      .eq('entity_type', input.entityType)
      .eq('entity_id', input.entityId)
      .eq('request_type', input.requestType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data ?? null
  }

  async completeMatchCallback(aiRequestId: string, matchCount?: number): Promise<void> {
    const existing = await this.findById(aiRequestId)
    if (!existing || existing.status === 'completed') return

    const priorResult =
      existing.result && typeof existing.result === 'object'
        ? (existing.result as Record<string, unknown>)
        : {}

    await this.update(aiRequestId, {
      status: 'completed',
      result: {
        ...priorResult,
        match_count: matchCount ?? priorResult.match_count ?? 0,
        callback: true,
      },
    })
  }
}
