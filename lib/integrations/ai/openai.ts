import {
  TALENT_MATCH_RESPONSE_SCHEMA,
  buildTalentMatchPrompt,
} from '@/lib/integrations/ai/prompt'
import type {
  AiMatchResult,
  OpportunityMatchContext,
  TalentMatchCandidate,
} from '@/lib/integrations/ai/types'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

// gpt-4o pricing per 1M tokens (approximate, for metering)
const INPUT_COST_PER_M = 2.5
const OUTPUT_COST_PER_M = 10.0

function getModel(): string {
  return process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
}

function estimateCost(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * INPUT_COST_PER_M +
    (outputTokens / 1_000_000) * OUTPUT_COST_PER_M
  )
}

export async function rankTalentWithOpenAi(
  opportunity: OpportunityMatchContext,
  candidates: TalentMatchCandidate[]
): Promise<AiMatchResult & { promptHash: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  if (!candidates.length) {
    return {
      matches: [],
      provider: 'openai',
      model: getModel(),
      usedFallback: false,
      promptHash: buildTalentMatchPrompt(opportunity, candidates).promptHash,
    }
  }

  const { system, user, promptHash } = buildTalentMatchPrompt(opportunity, candidates)
  const model = getModel()

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: {
        type: 'json_schema',
        json_schema: TALENT_MATCH_RESPONSE_SCHEMA,
      },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
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

  const parsed = JSON.parse(content) as {
    matches: Array<{
      freelancer_id: string
      score: number
      rationale: string
      skill_overlap: string[]
    }>
  }

  const candidateIds = new Set(candidates.map((c) => c.id))
  const matches = (parsed.matches ?? [])
    .filter((m) => candidateIds.has(m.freelancer_id))
    .map((m) => ({
      freelancerId: m.freelancer_id,
      score: Math.min(100, Math.max(0, Number(m.score))),
      rationale: m.rationale,
      skillOverlap: m.skill_overlap ?? [],
    }))
    .sort((a, b) => b.score - a.score)

  const inputTokens = json.usage?.prompt_tokens ?? 0
  const outputTokens = json.usage?.completion_tokens ?? 0

  return {
    matches,
    provider: 'openai',
    model,
    inputTokens,
    outputTokens,
    estimatedCost: estimateCost(inputTokens, outputTokens),
    usedFallback: false,
    promptHash,
  }
}
