import { createAdminClient } from '@/lib/supabase/admin'
import type { AiProvider, AiRequestType } from '@/lib/integrations/ai/types'

interface TenantAiSettings {
  aiMatchingEnabled: boolean
  aiPmEnabled: boolean
  maxAiRequestsMonthly: number
}

const TIER_DEFAULTS: Record<string, number> = {
  starter: 100,
  pro: 1000,
  enterprise: 100_000,
}

export async function getTenantAiSettings(tenantId: string): Promise<TenantAiSettings> {
  const supabase = createAdminClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings, subscription_status')
    .eq('id', tenantId)
    .maybeSingle()

  const settings = (tenant?.settings ?? {}) as Record<string, unknown>
  const features = (settings.features ?? {}) as Record<string, unknown>
  const limits = (settings.limits ?? {}) as Record<string, unknown>
  const subscription = (settings.subscription ?? {}) as Record<string, unknown>
  const tier = String(subscription.tier ?? 'starter')

  return {
    aiMatchingEnabled: features.ai_matching !== false,
    aiPmEnabled: features.ai_pm !== false,
    maxAiRequestsMonthly:
      typeof limits.max_ai_requests_monthly === 'number'
        ? limits.max_ai_requests_monthly
        : TIER_DEFAULTS[tier] ?? TIER_DEFAULTS.starter,
  }
}

export async function assertAiFeatureAllowed(
  tenantId: string,
  feature: 'talent_match' | 'brief_parse' | 'project_summary' | 'shortlist_summary' | 'status_assessment'
): Promise<void> {
  const settings = await getTenantAiSettings(tenantId)

  if (feature === 'talent_match' && !settings.aiMatchingEnabled) {
    throw new Error('AI_MATCHING_DISABLED')
  }

  if (feature !== 'talent_match' && !settings.aiPmEnabled) {
    throw new Error('AI_PM_DISABLED')
  }

  const supabase = createAdminClient()
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('ai_requests')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', monthStart.toISOString())

  if ((count ?? 0) >= settings.maxAiRequestsMonthly) {
    throw new Error('AI_MONTHLY_LIMIT_EXCEEDED')
  }
}

export async function assertAiMatchingAllowed(tenantId: string): Promise<void> {
  await assertAiFeatureAllowed(tenantId, 'talent_match')
}

export async function createAiRequest(input: {
  tenantId: string
  correlationId?: string
  provider: AiProvider
  model: string
  requestType: AiRequestType
  entityType?: string
  entityId?: string
  promptHash?: string
}): Promise<string> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
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
      status: 'pending',
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Failed to create AI request: ${error?.message ?? 'unknown'}`)
  }

  return data.id as string
}

export async function updateAiRequest(
  aiRequestId: string,
  patch: {
    status?: 'processing' | 'completed' | 'failed'
    result?: Record<string, unknown>
    errorMessage?: string
    inputTokens?: number
    outputTokens?: number
    estimatedCost?: number
    durationMs?: number
    promptHash?: string
  }
) {
  const supabase = createAdminClient()

  await supabase
    .from('ai_requests')
    .update({
      status: patch.status,
      result: patch.result,
      error_message: patch.errorMessage,
      input_tokens: patch.inputTokens,
      output_tokens: patch.outputTokens,
      estimated_cost: patch.estimatedCost,
      duration_ms: patch.durationMs,
      prompt_hash: patch.promptHash,
      completed_at:
        patch.status === 'completed' || patch.status === 'failed'
          ? new Date().toISOString()
          : undefined,
    })
    .eq('id', aiRequestId)
}
