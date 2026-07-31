export function envFlagKey(flagKey: string): string {
  return `PLATFORM_FLAG_${flagKey.toUpperCase()}`
}

export function envConfigKey(configKey: string): string {
  return `PLATFORM_CONFIG_${configKey.toUpperCase()}`
}

/** Known platform feature flag keys for Talent OS. */
export const PLATFORM_FLAG_KEYS = {
  AI_MATCHING: 'ai_matching',
  AI_PM: 'ai_pm',
  HYBRID_SEARCH: 'hybrid_search',
  WORKFLOW_ENGINE: 'workflow_engine',
} as const

export const LEGACY_TENANT_FLAG_MAP: Record<string, string> = {
  ai_matching: 'ai_matching',
  ai_pm: 'ai_pm',
}
