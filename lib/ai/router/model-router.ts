import type { AiFeature, ProviderId } from '@/lib/ai/types'
import { loadGatewayConfig } from '@/lib/ai/config'

export interface ModelRouteInput {
  feature?: AiFeature
  provider?: ProviderId
  model?: string
  structured?: boolean
  tenantTier?: 'starter' | 'pro' | 'enterprise'
  preferCostEfficient?: boolean
}

export interface ModelRouteResult {
  provider: ProviderId
  model: string
  reason: string
}

/** Feature → preferred model mapping. Overridden by explicit request.model. */
const FEATURE_MODELS: Partial<Record<AiFeature, { provider: ProviderId; model: string }>> = {
  talent_match: { provider: 'openai', model: 'gpt-4o-mini' },
  brief_parse: { provider: 'openai', model: 'gpt-4o-mini' },
  project_summary: { provider: 'openai', model: 'gpt-4o-mini' },
  shortlist_summary: { provider: 'openai', model: 'gpt-4o-mini' },
  status_assessment: { provider: 'openai', model: 'gpt-4o-mini' },
  digest: { provider: 'openai', model: 'gpt-4o-mini' },
}

const TIER_UPGRADES: Record<string, { provider: ProviderId; model: string }> = {
  enterprise: { provider: 'openai', model: 'gpt-4o' },
  pro: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
}

export class ModelRouter {
  route(input: ModelRouteInput): ModelRouteResult {
    const config = loadGatewayConfig()

    if (input.model && input.provider) {
      return {
        provider: input.provider,
        model: input.model,
        reason: 'explicit_request',
      }
    }

    if (input.model) {
      const provider = input.provider ?? config.primaryProvider
      return { provider, model: input.model, reason: 'explicit_model' }
    }

    if (input.feature && FEATURE_MODELS[input.feature]) {
      const mapped = FEATURE_MODELS[input.feature]!
      if (input.tenantTier && TIER_UPGRADES[input.tenantTier] && !input.preferCostEfficient) {
        const upgrade = TIER_UPGRADES[input.tenantTier]
        return {
          provider: upgrade.provider,
          model: upgrade.model,
          reason: `tier_${input.tenantTier}`,
        }
      }
      return {
        provider: input.provider ?? mapped.provider,
        model: mapped.model,
        reason: `feature_${input.feature}`,
      }
    }

    const provider = input.provider ?? config.primaryProvider
    return {
      provider,
      model: config.models[provider],
      reason: 'default',
    }
  }

  resolveProviderChain(
    input: ModelRouteInput,
    fallbacks: ProviderId[]
  ): { primary: ProviderId; fallbacks: ProviderId[]; model: string } {
    const routed = this.route(input)
    const chain = [routed.provider, ...fallbacks.filter((p) => p !== routed.provider)]
    return { primary: routed.provider, fallbacks: chain.slice(1), model: routed.model }
  }
}

export const globalModelRouter = new ModelRouter()
