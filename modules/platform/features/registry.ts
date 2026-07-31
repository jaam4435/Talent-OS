/** Known platform feature flag keys — extended by Wave 0c catalog. */
export const PLATFORM_FLAG_KEYS = {
  AI_MATCHING: 'ai_matching',
  AI_PM: 'ai_pm',
  HYBRID_SEARCH: 'hybrid_search',
  WORKFLOW_ENGINE: 'workflow_engine',
} as const

export type PlatformFlagKey = (typeof PLATFORM_FLAG_KEYS)[keyof typeof PLATFORM_FLAG_KEYS]

/** Legacy tenant.settings.features keys mapped to platform flag keys. */
export const LEGACY_TENANT_FLAG_MAP: Record<string, string> = {
  ai_matching: 'ai_matching',
  ai_pm: 'ai_pm',
}

export function envFlagKey(productId: string, flagKey: string): string {
  return `PLATFORM_FLAG_${productId.toUpperCase()}_${flagKey.toUpperCase()}`
}

export function envConfigKey(productId: string, configKey: string): string {
  return `PLATFORM_CONFIG_${productId.toUpperCase()}_${configKey.toUpperCase()}`
}
