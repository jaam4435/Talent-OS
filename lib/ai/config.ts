import type { AiGatewayOptions, DbAiProvider, ProviderId } from '@/lib/ai/types'

function parseProviderList(value: string | undefined): ProviderId[] {
  if (!value?.trim()) return []
  return value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .filter((entry): entry is ProviderId =>
      ['openai', 'anthropic', 'gemini', 'openrouter', 'mock'].includes(entry)
    )
}

export function loadGatewayConfig(): Required<AiGatewayOptions> & {
  models: Record<ProviderId, string>
} {
  const primary = (process.env.AI_PRIMARY_PROVIDER ?? 'openai') as ProviderId

  return {
    primaryProvider: primary,
    fallbackProviders: parseProviderList(process.env.AI_FALLBACK_PROVIDERS),
    maxRetries: Number(process.env.AI_MAX_RETRIES ?? 3),
    retryBaseDelayMs: Number(process.env.AI_RETRY_BASE_DELAY_MS ?? 500),
    rateLimitRpm: Number(process.env.AI_RATE_LIMIT_RPM ?? 60),
    enableStreaming: process.env.AI_ENABLE_STREAMING !== 'false',
    enableCostTracking: process.env.AI_ENABLE_COST_TRACKING !== 'false',
    enableTokenLogging: process.env.AI_ENABLE_TOKEN_LOGGING !== 'false',
    models: {
      openai: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      anthropic: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-20241022',
      gemini: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash',
      openrouter: process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini',
      mock: 'mock-model',
    },
  }
}

export function getProviderApiKey(provider: ProviderId): string | undefined {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY
    case 'gemini':
      return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY
    case 'openrouter':
      return process.env.OPENROUTER_API_KEY
    case 'mock':
      return process.env.AI_MOCK_PROVIDER === 'true' || process.env.VITEST === 'true' ? 'mock-key' : undefined
    default:
      return undefined
  }
}

/** @deprecated Use provider id directly when writing ai_requests.provider */
export function mapProviderToDb(provider: ProviderId): DbAiProvider {
  switch (provider) {
    case 'anthropic':
      return 'claude'
    case 'gemini':
      return 'gemini'
    case 'openrouter':
      return 'openrouter'
    case 'mock':
      return 'mock'
    case 'openai':
    default:
      return 'openai'
  }
}
