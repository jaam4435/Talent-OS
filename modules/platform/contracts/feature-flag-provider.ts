import type { OrganizationContext, PlatformFeatureFlag, ProductId } from '@/modules/platform/types'

export interface FeatureFlagEvaluateOptions {
  readonly organizationId?: string | null
  readonly context?: OrganizationContext | null
}

export interface IFeatureFlagService {
  evaluate(
    productId: ProductId,
    flagKey: string,
    options?: FeatureFlagEvaluateOptions
  ): Promise<PlatformFeatureFlag>
  isEnabled(
    productId: ProductId,
    flagKey: string,
    options?: FeatureFlagEvaluateOptions
  ): Promise<boolean>
}
