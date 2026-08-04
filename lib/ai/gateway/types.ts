import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiStructuredRequest,
  JsonSchemaDefinition,
  ProviderCompletionParams,
  ProviderId,
} from '@/lib/ai/types'
import type { AiProviderInterface } from '@/lib/ai/providers/interface'

export interface PipelineExecuteInput {
  request: AiCompletionRequest
  structured: boolean
  schema?: JsonSchemaDefinition
  providers: AiProviderInterface[]
  params: ProviderCompletionParams
  promptHash: string
  startedAt: number
  usedFallback: boolean
}

export interface PipelineExecuteResult {
  response: AiCompletionResponse
  providerResult: {
    provider: ProviderId
    model: string
    inputTokens: number
    outputTokens: number
    content: string
  }
}

export type StructuredPipelineInput = PipelineExecuteInput & {
  request: AiStructuredRequest
  schema: JsonSchemaDefinition
}
