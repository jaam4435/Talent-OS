import { AnthropicProvider } from '@/lib/ai/providers/anthropic.provider'
import { GeminiProvider } from '@/lib/ai/providers/gemini.provider'
import { OpenAiProvider } from '@/lib/ai/providers/openai.provider'
import { OpenRouterProvider } from '@/lib/ai/providers/openrouter.provider'
import { MockProvider } from '@/lib/ai/providers/mock.provider'
import type { AiProviderInterface } from '@/lib/ai/providers/interface'
import type { ProviderId } from '@/lib/ai/types'

const ALL_PROVIDERS: AiProviderInterface[] = [
  new OpenAiProvider(),
  new AnthropicProvider(),
  new GeminiProvider(),
  new OpenRouterProvider(),
  new MockProvider(),
]

export function getProviderRegistry(): Map<ProviderId, AiProviderInterface> {
  return new Map(ALL_PROVIDERS.map((provider) => [provider.id, provider]))
}

export function getProvider(id: ProviderId): AiProviderInterface | undefined {
  return getProviderRegistry().get(id)
}

export function getConfiguredProviders(): AiProviderInterface[] {
  return ALL_PROVIDERS.filter((provider) => provider.isConfigured())
}

export function getProviderChain(primary: ProviderId, fallbacks: ProviderId[]): AiProviderInterface[] {
  const registry = getProviderRegistry()
  const ordered = [primary, ...fallbacks.filter((id) => id !== primary)]
  return ordered.map((id) => registry.get(id)).filter((p): p is AiProviderInterface => Boolean(p))
}

export {
  OpenAiProvider,
  AnthropicProvider,
  GeminiProvider,
  OpenRouterProvider,
  MockProvider,
}
