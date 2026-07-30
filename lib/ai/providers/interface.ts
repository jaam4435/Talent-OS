import type {
  ProviderCompletionParams,
  ProviderCompletionResult,
  ProviderId,
} from '@/lib/ai/types'

export interface AiProviderInterface {
  readonly id: ProviderId
  isConfigured(): boolean
  getDefaultModel(): string
  complete(params: ProviderCompletionParams): Promise<ProviderCompletionResult>
  stream(params: ProviderCompletionParams): AsyncGenerator<string>
  supportsStructuredOutput(): boolean
}

export abstract class BaseAiProvider implements AiProviderInterface {
  abstract readonly id: ProviderId

  abstract isConfigured(): boolean
  abstract getDefaultModel(): string
  abstract complete(params: ProviderCompletionParams): Promise<ProviderCompletionResult>
  abstract supportsStructuredOutput(): boolean

  async *stream(params: ProviderCompletionParams): AsyncGenerator<string> {
    const result = await this.complete(params)
    yield result.content
  }

  protected async readErrorBody(response: Response): Promise<string> {
    return response.text().catch(() => `HTTP ${response.status}`)
  }
}
