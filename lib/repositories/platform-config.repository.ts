import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { ProductId } from '@/modules/platform/types'

export interface PlatformConfigRow {
  configKey: string
  configValue: Record<string, unknown>
  tenantId: string | null
}

export class PlatformConfigRepository extends BaseRepository {
  async getConfig(
    productId: ProductId,
    configKey: string,
    tenantId: string | null
  ): Promise<PlatformConfigRow | null> {
    const cacheKey = this.cacheKey('platform_config', { productId, configKey, tenantId })

    return this.withCache(cacheKey, 60_000, async () => {
      let query = this.ctx.supabase
        .from('platform_config')
        .select('config_key, config_value, tenant_id')
        .eq('product_id', productId)
        .eq('config_key', configKey)

      if (tenantId === null) {
        query = query.is('tenant_id', null)
      } else {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query.maybeSingle()
      this.throwIfError(error)

      if (!data) return null

      return {
        configKey: data.config_key,
        configValue: (data.config_value ?? {}) as Record<string, unknown>,
        tenantId: data.tenant_id,
      }
    })
  }

  async listConfig(
    productId: ProductId,
    tenantId: string | null
  ): Promise<PlatformConfigRow[]> {
    let query = this.ctx.supabase
      .from('platform_config')
      .select('config_key, config_value, tenant_id')
      .eq('product_id', productId)

    if (tenantId === null) {
      query = query.is('tenant_id', null)
    } else {
      query = query.eq('tenant_id', tenantId)
    }

    const { data, error } = await query
    this.throwIfError(error)

    return (data ?? []).map((row) => ({
      configKey: row.config_key,
      configValue: (row.config_value ?? {}) as Record<string, unknown>,
      tenantId: row.tenant_id,
    }))
  }
}
