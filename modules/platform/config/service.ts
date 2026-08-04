import type { PlatformConfigRepository } from '@/lib/repositories/platform-config.repository'
import type { IProductRegistry } from '@/modules/platform/contracts/product-registry'
import type {
  ConfigGetOptions,
  ConfigValue,
  IConfigService,
} from '@/modules/platform/contracts/config-provider'
import { deepMerge } from '@/modules/platform/config/schema'
import { envConfigKey } from '@/modules/platform/features/registry'
import type { PlatformConfigScope, ProductId } from '@/modules/platform/types'

function readEnvConfig(productId: ProductId, configKey: string): unknown | undefined {
  const key = envConfigKey(productId, configKey)
  const raw = process.env[key]
  if (raw === undefined) return undefined

  try {
    return JSON.parse(raw) as unknown
  } catch {
    return raw
  }
}

function getNestedValue(obj: Record<string, unknown>, key: string): unknown {
  if (key in obj) return obj[key]

  const parts = key.split('.')
  let current: unknown = obj

  for (const part of parts) {
    if (current === null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }

  return current
}

export class ConfigService implements IConfigService {
  constructor(
    private readonly productRegistry: IProductRegistry,
    private readonly configRepo?: PlatformConfigRepository
  ) {}

  async get<T = unknown>(
    productId: ProductId,
    configKey: string,
    options: ConfigGetOptions = {}
  ): Promise<ConfigValue<T>> {
    const merged = await this.getMerged(productId, options)
    const value = getNestedValue(merged, configKey) as T

    let source: PlatformConfigScope = 'platform'
    if (options.requestOverride && getNestedValue(options.requestOverride, configKey) !== undefined) {
      source = 'request'
    } else if (readEnvConfig(productId, configKey) !== undefined) {
      source = 'env'
    } else if (
      options.context?.organizationId &&
      this.configRepo &&
      (await this.configRepo.getConfig(productId, configKey, options.context.organizationId))
    ) {
      source = 'organization'
    }

    return { value, source }
  }

  async getMerged(
    productId: ProductId,
    options: ConfigGetOptions = {}
  ): Promise<Record<string, unknown>> {
    const product = this.productRegistry.resolve(productId)
    let merged: Record<string, unknown> = { ...product.defaultConfig }

    if (this.configRepo) {
      const platformRows = await this.configRepo.listConfig(productId, null)
      for (const row of platformRows) {
        merged = deepMerge(merged, { [row.configKey]: row.configValue })
      }

      const organizationId = options.context?.organizationId ?? options.organizationId
      if (organizationId) {
        const orgRows = await this.configRepo.listConfig(productId, organizationId)
        for (const row of orgRows) {
          merged = deepMerge(merged, { [row.configKey]: row.configValue })
        }
      }
    }

    for (const [envKey, envValue] of Object.entries(process.env)) {
      const prefix = `PLATFORM_CONFIG_${productId.toUpperCase()}_`
      if (!envKey.startsWith(prefix) || envValue === undefined) continue

      const configKey = envKey.slice(prefix.length).toLowerCase()
      let parsed: unknown = envValue
      try {
        parsed = JSON.parse(envValue)
      } catch {
        // keep string
      }
      merged = deepMerge(merged, { [configKey]: parsed })
    }

    if (options.requestOverride) {
      merged = deepMerge(merged, options.requestOverride)
    }

    return merged
  }
}

export function createConfigService(deps: {
  productRegistry: IProductRegistry
  configRepo?: PlatformConfigRepository
}): ConfigService {
  return new ConfigService(deps.productRegistry, deps.configRepo)
}
