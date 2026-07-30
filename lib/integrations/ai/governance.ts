import { createAdminServices } from '@/lib/services/factory'
import type { AiProvider, AiRequestType } from '@/lib/integrations/ai/types'

export async function getTenantAiSettings(tenantId: string) {
  const services = await createAdminServices()
  return services.ai.getTenantAiSettings(tenantId)
}

export async function assertAiFeatureAllowed(
  tenantId: string,
  feature: 'talent_match' | 'brief_parse' | 'project_summary' | 'shortlist_summary' | 'status_assessment'
): Promise<void> {
  const services = await createAdminServices()
  return services.ai.assertAiFeatureAllowed(tenantId, feature)
}

export async function assertAiMatchingAllowed(tenantId: string): Promise<void> {
  const services = await createAdminServices()
  return services.ai.assertAiMatchingAllowed(tenantId)
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
  const services = await createAdminServices()
  return services.ai.createAiRequest(input)
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
  const services = await createAdminServices()
  await services.ai.updateAiRequest(aiRequestId, patch)
}
