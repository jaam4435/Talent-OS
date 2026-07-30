import { getAiGateway } from '@/lib/ai/gateway'
import { globalPromptManager } from '@/lib/ai/prompt/manager'
import type { AiCompletionRequest, AiFeature, AiStructuredRequest, ProviderId } from '@/lib/ai/types'

/** Execute a versioned prompt through the AI Gateway. */
export async function completeWithPrompt<T = unknown>(input: {
  promptId: string
  userContent: unknown
  promptVersion?: string
  schema?: AiStructuredRequest['schema']
  parse?: (raw: unknown) => T
  tenantId?: string
  feature?: AiFeature
  correlationId?: string
  entityType?: string
  entityId?: string
  provider?: ProviderId
  model?: string
  temperature?: number
  maxTokens?: number
  metadata?: Record<string, unknown>
}) {
  const built = globalPromptManager.build(input.promptId, input.userContent, input.promptVersion)
  const gateway = getAiGateway()

  const base: AiCompletionRequest = {
    messages: [
      { role: 'system', content: built.system },
      { role: 'user', content: built.user },
    ],
    tenantId: input.tenantId,
    feature: input.feature,
    correlationId: input.correlationId,
    entityType: input.entityType,
    entityId: input.entityId,
    promptId: built.promptId,
    promptVersion: built.promptVersion,
    provider: input.provider,
    model: input.model,
    temperature: input.temperature,
    maxTokens: input.maxTokens,
    metadata: { ...input.metadata, promptHash: built.promptHash },
  }

  if (input.schema) {
    return gateway.completeStructured<T>({
      ...base,
      schema: input.schema,
      parse: input.parse,
    })
  }

  return gateway.complete(base)
}
