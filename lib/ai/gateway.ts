export {
  AiGateway,
  createGateway,
} from '@/lib/ai/gateway/gateway'

import { AiGateway, createGateway } from '@/lib/ai/gateway/gateway'
import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiGatewayOptions,
  AiStructuredRequest,
} from '@/lib/ai/types'

let gatewayInstance: AiGateway | null = null

export function getAiGateway(options?: AiGatewayOptions): AiGateway {
  if (!gatewayInstance) {
    gatewayInstance = new AiGateway(options)
  }
  return gatewayInstance
}

export function resetAiGateway(): void {
  gatewayInstance = null
}

export async function callAiStructured<T>(input: {
  system: string
  user: string
  schema: NonNullable<AiStructuredRequest['schema']>
  temperature?: number
  tenantId?: string
  feature?: AiCompletionRequest['feature']
  promptId?: string
  promptVersion?: string
  provider?: AiCompletionRequest['provider']
  aiRequestId?: string
}): Promise<{
  data: T
  model: string
  provider: AiCompletionResponse['provider']
  inputTokens: number
  outputTokens: number
  estimatedCost: number
  promptHash: string
  usedFallback: boolean
  aiRequestId?: string
}> {
  const gateway = getAiGateway()
  const response = await gateway.completeStructured<T>({
    messages: [
      { role: 'system', content: input.system },
      { role: 'user', content: input.user },
    ],
    schema: input.schema,
    temperature: input.temperature,
    tenantId: input.tenantId,
    feature: input.feature,
    promptId: input.promptId,
    promptVersion: input.promptVersion,
    provider: input.provider,
    aiRequestId: input.aiRequestId,
  })

  return {
    data: response.data,
    model: response.model,
    provider: response.provider,
    inputTokens: response.usage.inputTokens,
    outputTokens: response.usage.outputTokens,
    estimatedCost: response.usage.estimatedCost,
    promptHash: response.promptHash,
    usedFallback: response.usedFallback,
    aiRequestId: response.aiRequestId,
  }
}
