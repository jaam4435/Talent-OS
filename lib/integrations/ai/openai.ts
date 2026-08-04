import { callAiStructured, mapProviderToDb } from '@/lib/ai'
import {
  TALENT_MATCH_RESPONSE_SCHEMA,
  buildTalentMatchPrompt,
} from '@/lib/integrations/ai/prompt'
import type {
  AiMatchResult,
  OpportunityMatchContext,
  TalentMatchCandidate,
} from '@/lib/integrations/ai/types'

function mapLegacyProvider(provider: import('@/lib/ai/types').ProviderId): AiMatchResult['provider'] {
  return mapProviderToDb(provider)
}

export async function rankTalentWithOpenAi(
  opportunity: OpportunityMatchContext,
  candidates: TalentMatchCandidate[],
  aiRequestId?: string
): Promise<AiMatchResult & { promptHash: string }> {
  const { system, user, promptHash } = buildTalentMatchPrompt(opportunity, candidates)

  if (!candidates.length) {
    return {
      matches: [],
      provider: 'openai',
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      usedFallback: false,
      promptHash,
    }
  }

  const result = await callAiStructured<{
    matches: Array<{
      freelancer_id: string
      score: number
      rationale: string
      skill_overlap: string[]
    }>
  }>({
    system,
    user,
    schema: TALENT_MATCH_RESPONSE_SCHEMA,
    tenantId: opportunity.tenantId,
    feature: 'talent_match',
    promptId: 'talent_match',
    promptVersion: '1.0.0',
    aiRequestId,
  })

  const candidateIds = new Set(candidates.map((c) => c.id))
  const matches = (result.data.matches ?? [])
    .filter((m) => candidateIds.has(m.freelancer_id))
    .map((m) => ({
      freelancerId: m.freelancer_id,
      score: Math.min(100, Math.max(0, Number(m.score))),
      rationale: m.rationale,
      skillOverlap: m.skill_overlap ?? [],
    }))
    .sort((a, b) => b.score - a.score)

  return {
    matches,
    provider: mapLegacyProvider(result.provider),
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    estimatedCost: result.estimatedCost,
    usedFallback: result.usedFallback,
    promptHash: result.promptHash,
  }
}
