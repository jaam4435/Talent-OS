import { getProviderApiKey, loadGatewayConfig } from '@/lib/ai/config'
import { AiProviderError } from '@/lib/ai/errors'
import { BaseAiProvider } from '@/lib/ai/providers/interface'
import type { ProviderCompletionParams, ProviderCompletionResult } from '@/lib/ai/types'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

export class AnthropicProvider extends BaseAiProvider {
  readonly id = 'anthropic' as const

  isConfigured(): boolean {
    return Boolean(getProviderApiKey('anthropic'))
  }

  getDefaultModel(): string {
    return loadGatewayConfig().models.anthropic
  }

  supportsStructuredOutput(): boolean {
    return true
  }

  async complete(params: ProviderCompletionParams): Promise<ProviderCompletionResult> {
    const apiKey = getProviderApiKey('anthropic')
    if (!apiKey) {
      throw new AiProviderError('anthropic', 'ANTHROPIC_API_KEY not configured', 503)
    }

    const systemMessage = params.messages.find((m) => m.role === 'system')?.content
    const nonSystemMessages = params.messages.filter((m) => m.role !== 'system')

    const body: Record<string, unknown> = {
      model: params.model,
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature,
      system: systemMessage,
      messages: nonSystemMessages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    }

    if (params.schema) {
      body.tools = [
        {
          name: params.schema.name,
          description: 'Return structured JSON output',
          input_schema: params.schema.schema,
        },
      ]
      body.tool_choice = { type: 'tool', name: params.schema.name }
    }

    const response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new AiProviderError('anthropic', await this.readErrorBody(response), response.status)
    }

    const json = (await response.json()) as {
      content?: Array<{ type: string; text?: string; input?: unknown }>
      usage?: { input_tokens?: number; output_tokens?: number }
    }

    let content = ''
    const toolBlock = json.content?.find((block) => block.type === 'tool_use')
    if (toolBlock?.input) {
      content = JSON.stringify(toolBlock.input)
    } else {
      content = json.content?.find((block) => block.type === 'text')?.text ?? ''
    }

    if (!content) {
      throw new AiProviderError('anthropic', 'Empty response content')
    }

    return {
      content,
      model: params.model,
      inputTokens: json.usage?.input_tokens ?? 0,
      outputTokens: json.usage?.output_tokens ?? 0,
      raw: json,
    }
  }

  async *stream(params: ProviderCompletionParams): AsyncGenerator<string> {
    const apiKey = getProviderApiKey('anthropic')
    if (!apiKey) {
      throw new AiProviderError('anthropic', 'ANTHROPIC_API_KEY not configured', 503)
    }

    const systemMessage = params.messages.find((m) => m.role === 'system')?.content
    const nonSystemMessages = params.messages.filter((m) => m.role !== 'system')

    const response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: params.model,
        max_tokens: params.maxTokens ?? 4096,
        temperature: params.temperature,
        system: systemMessage,
        stream: true,
        messages: nonSystemMessages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      }),
    })

    if (!response.ok) {
      throw new AiProviderError('anthropic', await this.readErrorBody(response), response.status)
    }

    if (!response.body) {
      throw new AiProviderError('anthropic', 'Streaming body unavailable')
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
        if (!line.startsWith('data:')) continue
        try {
          const event = JSON.parse(line.slice(5).trim()) as {
            type?: string
            delta?: { text?: string }
          }
          if (event.type === 'content_block_delta' && event.delta?.text) {
            yield event.delta.text
          }
        } catch {
          // ignore malformed events
        }
      }
    }
  }
}
