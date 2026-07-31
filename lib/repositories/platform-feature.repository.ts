import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { ProductId } from '@/modules/platform/types'

export interface PlatformFeatureFlagRow {
  flagKey: string
  enabled: boolean
  value: unknown | null
  tenantId: string | null
}

export class PlatformFeatureRepository extends BaseRepository {
  async getFlag(
    productId: ProductId,
    flagKey: string,
    tenantId: string | null
  ): Promise<PlatformFeatureFlagRow | null> {
    const cacheKey = this.cacheKey('platform_feature_flags', { productId, flagKey, tenantId })

    return this.withCache(cacheKey, 60_000, async () => {
      let query = this.ctx.supabase
        .from('platform_feature_flags')
        .select('flag_key, enabled, value, tenant_id')
        .eq('product_id', productId)
        .eq('flag_key', flagKey)

      if (tenantId === null) {
        query = query.is('tenant_id', null)
      } else {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query.maybeSingle()
      this.throwIfError(error)

      if (!data) return null

      return {
        flagKey: data.flag_key,
        enabled: data.enabled,
        value: data.value,
        tenantId: data.tenant_id,
      }
    })
  }
}
