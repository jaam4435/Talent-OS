import { AiConfigurationError, AiProviderError } from '@/lib/ai/errors'
import type { AiProviderInterface } from '@/lib/ai/providers/interface'
import type { ProviderCompletionParams, ProviderCompletionResult, ProviderId } from '@/lib/ai/types'

export async function executeWithFallback(
  providers: AiProviderInterface[],
  params: ProviderCompletionParams,
  onFallback?: (from: ProviderId, to: ProviderId, error: unknown) => void
): Promise<ProviderCompletionResult & { provider: ProviderId }> {
  const configured = providers.filter((p) => p.isConfigured())

  if (!configured.length) {
    throw new AiConfigurationError('No AI providers are configured')
  }

  let lastError: unknown

  for (let i = 0; i < configured.length; i++) {
    const provider = configured[i]!
    try {
      const result = await provider.complete(params)
      return { ...result, provider: provider.id }
    } catch (error) {
      lastError = error
      const next = configured[i + 1]
      if (next) {
        onFallback?.(provider.id, next.id, error)
        continue
      }
      throw error instanceof AiProviderError
        ? error
        : new AiProviderError(provider.id, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  throw lastError
}

export async function* streamWithFallback(
  providers: AiProviderInterface[],
  params: ProviderCompletionParams,
  onFallback?: (from: ProviderId, to: ProviderId, error: unknown) => void
): AsyncGenerator<string> {
  const configured = providers.filter((p) => p.isConfigured())
  if (!configured.length) {
    throw new AiConfigurationError('No AI providers are configured')
  }

  for (let i = 0; i < configured.length; i++) {
    const provider = configured[i]!
    try {
      for await (const chunk of provider.stream(params)) {
        yield chunk
      }
      return
    } catch (error) {
      const next = configured[i + 1]
      if (next) {
        onFallback?.(provider.id, next.id, error)
        continue
      }
      throw error
    }
  }
}
