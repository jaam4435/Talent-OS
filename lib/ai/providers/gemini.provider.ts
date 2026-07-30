import { getProviderApiKey, loadGatewayConfig } from '@/lib/ai/config'
import { AiProviderError } from '@/lib/ai/errors'
import { BaseAiProvider } from '@/lib/ai/providers/interface'
import type { ProviderCompletionParams, ProviderCompletionResult } from '@/lib/ai/types'

function buildGeminiUrl(model: string, apiKey: string, stream = false): string {
  const action = stream ? 'streamGenerateContent' : 'generateContent'
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:${action}?key=${apiKey}`
}

export class GeminiProvider extends BaseAiProvider {
  readonly id = 'gemini' as const

  isConfigured(): boolean {
    return Boolean(getProviderApiKey('gemini'))
  }

  getDefaultModel(): string {
    return loadGatewayConfig().models.gemini
  }

  supportsStructuredOutput(): boolean {
    return true
  }

  async complete(params: ProviderCompletionParams): Promise<ProviderCompletionResult> {
    const apiKey = getProviderApiKey('gemini')
    if (!apiKey) {
      throw new AiProviderError('gemini', 'GEMINI_API_KEY not configured', 503)
    }

    const systemInstruction = params.messages.find((m) => m.role === 'system')?.content
    const contents = params.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: params.temperature,
        maxOutputTokens: params.maxTokens,
      },
    }

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] }
    }

    if (params.schema) {
      body.generationConfig = {
        ...(body.generationConfig as Record<string, unknown>),
        responseMimeType: 'application/json',
        responseSchema: params.schema.schema,
      }
    }

    const response = await fetch(buildGeminiUrl(params.model, apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new AiProviderError('gemini', await this.readErrorBody(response), response.status)
    }

    const json = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
    }

    const content = json.candidates?.[0]?.content?.parts?.[0]?.text
    if (!content) {
      throw new AiProviderError('gemini', 'Empty response content')
    }

    return {
      content,
      model: params.model,
      inputTokens: json.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: json.usageMetadata?.candidatesTokenCount ?? 0,
      raw: json,
    }
  }

  async *stream(params: ProviderCompletionParams): AsyncGenerator<string> {
    const apiKey = getProviderApiKey('gemini')
    if (!apiKey) {
      throw new AiProviderError('gemini', 'GEMINI_API_KEY not configured', 503)
    }

    const systemInstruction = params.messages.find((m) => m.role === 'system')?.content
    const contents = params.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

    const body: Record<string, unknown> = {
      contents,
      generationConfig: { temperature: params.temperature },
    }

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] }
    }

    const response = await fetch(buildGeminiUrl(params.model, apiKey, true), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new AiProviderError('gemini', await this.readErrorBody(response), response.status)
    }

    if (!response.body) {
      throw new AiProviderError('gemini', 'Streaming body unavailable')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Gemini streams JSON objects; extract text parts when present
      const chunks = buffer.split('\n')
      buffer = chunks.pop() ?? ''

      for (const chunk of chunks) {
        const trimmed = chunk.trim().replace(/^,|,$/g, '')
        if (!trimmed.startsWith('{')) continue
        try {
          const parsed = JSON.parse(trimmed) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
          }
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) yield text
        } catch {
          // wait for complete JSON object
        }
      }
    }
  }
}
