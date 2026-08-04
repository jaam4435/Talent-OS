import { BaseRepository } from '@/lib/repositories/base/base.repository'

export interface PlatformConfigRow {
  configKey: string
  configValue: Record<string, unknown>
  tenantId: string | null
}

export class PlatformConfigRepository extends BaseRepository {
  async getConfig(configKey: string, tenantId: string | null): Promise<PlatformConfigRow | null> {
    const cacheKey = this.cacheKey('platform_config', { configKey, tenantId })

    return this.withCache(cacheKey, 60_000, async () => {
      let query = this.ctx.supabase
        .from('platform_config')
        .select('config_key, config_value, tenant_id')
        .eq('config_key', configKey)

      query = tenantId === null ? query.is('tenant_id', null) : query.eq('tenant_id', tenantId)

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

  async listConfig(tenantId: string | null): Promise<PlatformConfigRow[]> {
    let query = this.ctx.supabase
      .from('platform_config')
      .select('config_key, config_value, tenant_id')

    query = tenantId === null ? query.is('tenant_id', null) : query.eq('tenant_id', tenantId)

    const { data, error } = await query
    this.throwIfError(error)

    return (data ?? []).map((row) => ({
      configKey: row.config_key,
      configValue: (row.config_value ?? {}) as Record<string, unknown>,
      tenantId: row.tenant_id,
    }))
  }
}
