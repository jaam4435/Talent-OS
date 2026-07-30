import { createAdminRepositories } from '@/lib/repositories/factory'
import type { AiProvider, AiRequestType } from '@/lib/integrations/ai/types'

interface TenantAiSettings {
  aiMatchingEnabled: boolean
  aiPmEnabled: boolean
  maxAiRequestsMonthly: number
}

export async function getTenantAiSettings(tenantId: string): Promise<TenantAiSettings> {
  const repos = await createAdminRepositories()
  return repos.tenant.getAiSettings(tenantId)
}

export async function assertAiFeatureAllowed(
  tenantId: string,
  feature: 'talent_match' | 'brief_parse' | 'project_summary' | 'shortlist_summary' | 'status_assessment'
): Promise<void> {
  const repos = await createAdminRepositories()
  const settings = await repos.tenant.getAiSettings(tenantId)

  if (feature === 'talent_match' && !settings.aiMatchingEnabled) {
    throw new Error('AI_MATCHING_DISABLED')
  }

  if (feature !== 'talent_match' && !settings.aiPmEnabled) {
    throw new Error('AI_PM_DISABLED')
  }

  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  const count = await repos.aiRequest.countMonthlyByTenant(tenantId, monthStart)
  if (count >= settings.maxAiRequestsMonthly) {
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
  const repos = await createAdminRepositories()
  return repos.aiRequest.create(input)
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
  const repos = await createAdminRepositories()
  await repos.aiRequest.update(aiRequestId, patch)
}
