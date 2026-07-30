import {
  assertAiFeatureAllowed,
  getTenantAiSettings,
} from '@/lib/integrations/ai/governance'
import { AiFeatureDisabledError } from '@/lib/ai/errors'
import type { AiFeature } from '@/lib/ai/types'

export async function assertFeatureEnabled(tenantId: string, feature: AiFeature): Promise<void> {
  if (feature === 'digest') return

  try {
    await assertAiFeatureAllowed(tenantId, feature)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI feature disabled'
    if (message === 'AI_MATCHING_DISABLED') {
      throw new AiFeatureDisabledError('talent_match')
    }
    if (message === 'AI_PM_DISABLED') {
      throw new AiFeatureDisabledError(feature)
    }
    if (message === 'AI_MONTHLY_LIMIT_EXCEEDED') {
      throw new AiFeatureDisabledError('monthly_limit')
    }
    throw error
  }
}

export async function isFeatureEnabled(
  tenantId: string,
  feature: AiFeature
): Promise<boolean> {
  try {
    await assertFeatureEnabled(tenantId, feature)
    return true
  } catch {
    return false
  }
}

export async function getFeatureFlags(tenantId: string) {
  const settings = await getTenantAiSettings(tenantId)
  return {
    aiMatchingEnabled: settings.aiMatchingEnabled,
    aiPmEnabled: settings.aiPmEnabled,
    maxAiRequestsMonthly: settings.maxAiRequestsMonthly,
  }
}

export function isGatewayFeatureFlagEnabled(flag: string): boolean {
  const envKey = `AI_FEATURE_${flag.toUpperCase()}`
  const value = process.env[envKey]
  if (value === undefined) return true
  return value !== 'false' && value !== '0'
}
