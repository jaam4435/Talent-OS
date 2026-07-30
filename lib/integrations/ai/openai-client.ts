import { callAiStructured, estimateTokenCost } from '@/lib/ai'

/**
 * @deprecated Use `callAiStructured` from `@/lib/ai` directly.
 */
export function getOpenAiModel(): string {
  return process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
}

export function estimateOpenAiCost(inputTokens: number, outputTokens: number): number {
  return estimateTokenCost('openai', getOpenAiModel(), inputTokens, outputTokens)
}

/**
 * @deprecated Use `callAiStructured` from `@/lib/ai`.
 * All AI requests must go through the AI Gateway.
 */
export async function callOpenAiStructured<T>(input: {
  system: string
  user: string
  schema: {
    name: string
    strict: boolean
    schema: Record<string, unknown>
  }
  temperature?: number
  tenantId?: string
  feature?: import('@/lib/ai/types').AiFeature
  promptId?: string
  promptVersion?: string
}): Promise<{
  data: T
  model: string
  inputTokens: number
  outputTokens: number
  estimatedCost: number
  promptHash: string
}> {
  const result = await callAiStructured<T>({
    system: input.system,
    user: input.user,
    schema: input.schema,
    temperature: input.temperature,
    tenantId: input.tenantId,
    feature: input.feature,
    promptId: input.promptId,
    promptVersion: input.promptVersion,
  })

  return {
    data: result.data,
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    estimatedCost: result.estimatedCost,
    promptHash: result.promptHash,
  }
}
