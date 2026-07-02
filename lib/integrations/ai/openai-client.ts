import { hashPayload } from '@/lib/integrations/encryption'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

const INPUT_COST_PER_M = 2.5
const OUTPUT_COST_PER_M = 10.0

export function getOpenAiModel(): string {
  return process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
}

export function estimateOpenAiCost(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * INPUT_COST_PER_M +
    (outputTokens / 1_000_000) * OUTPUT_COST_PER_M
  )
}

export async function callOpenAiStructured<T>(input: {
  system: string
  user: string
  schema: {
    name: string
    strict: boolean
    schema: Record<string, unknown>
  }
  temperature?: number
}): Promise<{
  data: T
  model: string
  inputTokens: number
  outputTokens: number
  estimatedCost: number
  promptHash: string
}> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const model = getOpenAiModel()
  const promptHash = hashPayload({ system: input.system, user: input.user })

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: input.temperature ?? 0.2,
      response_format: {
        type: 'json_schema',
        json_schema: input.schema,
      },
      messages: [
        { role: 'system', content: input.system },
        { role: 'user', content: input.user },
      ],
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown OpenAI error')
    throw new Error(`OpenAI request failed (${response.status}): ${text}`)
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }

  const content = json.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('OpenAI returned empty content')
  }

  const inputTokens = json.usage?.prompt_tokens ?? 0
  const outputTokens = json.usage?.completion_tokens ?? 0

  return {
    data: JSON.parse(content) as T,
    model,
    inputTokens,
    outputTokens,
    estimatedCost: estimateOpenAiCost(inputTokens, outputTokens),
    promptHash,
  }
}
