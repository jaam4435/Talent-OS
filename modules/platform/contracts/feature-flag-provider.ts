import type { OrganizationContext, PlatformFeatureFlag } from '@/modules/platform/types'

export interface FeatureFlagEvaluateOptions {
  readonly organizationId?: string | null
  readonly context?: OrganizationContext | null
}

export interface IFeatureFlagService {
  evaluate(flagKey: string, options?: FeatureFlagEvaluateOptions): Promise<PlatformFeatureFlag>
  isEnabled(flagKey: string, options?: FeatureFlagEvaluateOptions): Promise<boolean>
}
