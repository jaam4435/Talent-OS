import { BaseRepository } from '@/lib/repositories/base/base.repository'

export interface TenantAiSettings {
  aiMatchingEnabled: boolean
  aiPmEnabled: boolean
  maxAiRequestsMonthly: number
}

const TIER_DEFAULTS: Record<string, number> = {
  starter: 100,
  pro: 1000,
  enterprise: 100_000,
}

export class TenantRepository extends BaseRepository {
  async getAiSettings(tenantId: string): Promise<TenantAiSettings> {
    const { data: tenant } = await this.ctx.supabase
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
}
