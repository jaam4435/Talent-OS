import { getProviderApiKey, loadGatewayConfig } from '@/lib/ai/config'
import { AiProviderError } from '@/lib/ai/errors'
import { BaseAiProvider } from '@/lib/ai/providers/interface'
import type { ProviderCompletionParams, ProviderCompletionResult } from '@/lib/ai/types'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export class OpenRouterProvider extends BaseAiProvider {
  readonly id = 'openrouter' as const

  isConfigured(): boolean {
    return Boolean(getProviderApiKey('openrouter'))
  }

  getDefaultModel(): string {
    return loadGatewayConfig().models.openrouter
  }

  supportsStructuredOutput(): boolean {
    return true
  }

  async complete(params: ProviderCompletionParams): Promise<ProviderCompletionResult> {
    const apiKey = getProviderApiKey('openrouter')
    if (!apiKey) {
      throw new AiProviderError('openrouter', 'OPENROUTER_API_KEY not configured', 503)
    }

    const body: Record<string, unknown> = {
      model: params.model,
      temperature: params.temperature,
      messages: params.messages,
    }

    if (params.maxTokens) {
      body.max_tokens = params.maxTokens
    }

    if (params.schema) {
      body.response_format = {
        type: 'json_schema',
        json_schema: params.schema,
      }
    }

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://talent-os.app',
        'X-Title': 'Talent OS',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new AiProviderError('openrouter', await this.readErrorBody(response), response.status)
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
      usage?: { prompt_tokens?: number; completion_tokens?: number }
    }

    const content = json.choices?.[0]?.message?.content
    if (!content) {
      throw new AiProviderError('openrouter', 'Empty response content')
    }

    return {
      content,
      model: params.model,
      inputTokens: json.usage?.prompt_tokens ?? 0,
      outputTokens: json.usage?.completion_tokens ?? 0,
      raw: json,
    }
  }

  async *stream(params: ProviderCompletionParams): AsyncGenerator<string> {
    const apiKey = getProviderApiKey('openrouter')
    if (!apiKey) {
      throw new AiProviderError('openrouter', 'OPENROUTER_API_KEY not configured', 503)
    }

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://talent-os.app',
        'X-Title': 'Talent OS',
      },
      body: JSON.stringify({
        model: params.model,
        temperature: params.temperature,
        messages: params.messages,
        stream: true,
      }),
    })

    if (!response.ok) {
      throw new AiProviderError('openrouter', await this.readErrorBody(response), response.status)
    }

    if (!response.body) {
      throw new AiProviderError('openrouter', 'Streaming body unavailable')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (payload === '[DONE]') return

        try {
          const parsed = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>
          }
          const chunk = parsed.choices?.[0]?.delta?.content
          if (chunk) yield chunk
        } catch {
          // ignore malformed SSE chunks
        }
      }
    }
  }
}
