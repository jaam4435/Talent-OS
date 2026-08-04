import { BaseRepository } from '@/lib/repositories/base/base.repository'

export interface PlatformFeatureFlagRow {
  flagKey: string
  enabled: boolean
  value: unknown | null
  tenantId: string | null
}

export class PlatformFeatureRepository extends BaseRepository {
  async getFlag(flagKey: string, tenantId: string | null): Promise<PlatformFeatureFlagRow | null> {
    const cacheKey = this.cacheKey('platform_feature_flags', { flagKey, tenantId })

    return this.withCache(cacheKey, 60_000, async () => {
      let query = this.ctx.supabase
        .from('platform_feature_flags')
        .select('flag_key, enabled, value, tenant_id')
        .eq('flag_key', flagKey)

      query = tenantId === null ? query.is('tenant_id', null) : query.eq('tenant_id', tenantId)

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
