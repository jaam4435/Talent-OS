import { createAdminClient } from '@/lib/supabase/admin'
import { emitEvent } from '@/lib/integrations/events'
import {
  assertAiMatchingAllowed,
  createAiRequest,
  updateAiRequest,
} from '@/lib/integrations/ai/governance'
import { runRuleBasedMatching } from '@/lib/integrations/ai/fallback'
import { rankTalentWithOpenAi } from '@/lib/integrations/ai/openai'
import type {
  AiMatchResult,
  OpportunityMatchContext,
  TalentMatchCandidate,
  TalentMatchScoreRow,
} from '@/lib/integrations/ai/types'

function redactDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts[0] ?? 'Freelancer'
}

async function fetchOpportunityContext(opportunityId: string): Promise<OpportunityMatchContext | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('opportunities')
    .select(
      'id, tenant_id, title, description, required_skills, discipline, budget, currency, client_name'
    )
    .eq('id', opportunityId)
    .maybeSingle()

  if (!data) return null

  return {
    id: data.id,
    tenantId: data.tenant_id,
    title: data.title,
    description: data.description,
    requiredSkills: data.required_skills ?? [],
    discipline: data.discipline,
    budget: data.budget,
    currency: data.currency,
    clientName: data.client_name,
  }
}

async function fetchMatchCandidates(
  opportunity: OpportunityMatchContext
): Promise<TalentMatchCandidate[]> {
  const supabase = createAdminClient()

  const { data: recipients } = await supabase
    .from('opportunity_recipients')
    .select('freelancer_id')
    .eq('opportunity_id', opportunity.id)

  const excludedSet = new Set(recipients?.map((r) => r.freelancer_id) ?? [])

  let query = supabase
    .from('freelancers')
    .select(
      'id, full_name, discipline, skills, day_rate, availability, internal_rating, bio, tags'
    )
    .eq('tenant_id', opportunity.tenantId)
    .eq('availability', 'available')
    .limit(50)

  if (opportunity.discipline) {
    query = query.eq('discipline', opportunity.discipline)
  }

  const { data: freelancers } = await query

  return (freelancers ?? [])
    .filter((f) => !excludedSet.has(f.id))
    .map((f) => ({
      id: f.id,
      displayName: redactDisplayName(f.full_name),
      discipline: f.discipline,
      skills: f.skills ?? [],
      dayRate: f.day_rate,
      availability: f.availability,
      internalRating: f.internal_rating,
      bio: f.bio,
      tags: f.tags ?? [],
    }))
}

export async function persistMatchScores(
  opportunityId: string,
  tenantId: string,
  aiRequestId: string,
  result: AiMatchResult
) {
  const supabase = createAdminClient()

  const rows = result.matches.map((match, index) => ({
    tenant_id: tenantId,
    opportunity_id: opportunityId,
    freelancer_id: match.freelancerId,
    ai_request_id: aiRequestId,
    score: match.score,
    rationale: match.rationale,
    skill_overlap: match.skillOverlap,
    rank: match.rank ?? index + 1,
  }))

  if (!rows.length) return

  await supabase.from('talent_match_scores').upsert(rows, {
    onConflict: 'opportunity_id,freelancer_id',
  })
}

async function notifyMatchCompleted(
  tenantId: string,
  opportunityId: string,
  opportunityTitle: string,
  actorId: string | null,
  matchCount: number
) {
  if (!actorId) return

  const supabase = createAdminClient()
  await supabase.from('notifications').insert({
    tenant_id: tenantId,
    user_id: actorId,
    type: 'system',
    title: 'AI talent matches ready',
    body: `${matchCount} ranked suggestion(s) for "${opportunityTitle}".`,
    data: {
      opportunity_id: opportunityId,
      kind: 'ai_match_completed',
    },
  })
}

export async function executeTalentMatch(aiRequestId: string, actorId?: string | null) {
  const supabase = createAdminClient()
  const startedAt = Date.now()

  const { data: aiRequest } = await supabase
    .from('ai_requests')
    .select('*')
    .eq('id', aiRequestId)
    .maybeSingle()

  if (!aiRequest) {
    throw new Error('AI_REQUEST_NOT_FOUND')
  }

  if (aiRequest.status === 'completed') {
    return { aiRequestId, status: 'completed' as const, skipped: true }
  }

  const opportunityId = aiRequest.entity_id
  if (!opportunityId || aiRequest.request_type !== 'talent_match') {
    throw new Error('INVALID_AI_REQUEST')
  }

  await updateAiRequest(aiRequestId, { status: 'processing' })

  const opportunity = await fetchOpportunityContext(opportunityId)
  if (!opportunity) {
    await updateAiRequest(aiRequestId, {
      status: 'failed',
      errorMessage: 'Opportunity not found',
    })
    throw new Error('OPPORTUNITY_NOT_FOUND')
  }

  const candidates = await fetchMatchCandidates(opportunity)

  let result: AiMatchResult & { promptHash?: string }
  try {
    if (process.env.OPENAI_API_KEY) {
      result = await rankTalentWithOpenAi(opportunity, candidates)
    } else {
      throw new Error('OPENAI_API_KEY not configured')
    }
  } catch (error) {
    console.warn('AI matching failed, using rule-based fallback:', error)
    result = await runRuleBasedMatching(opportunity)
  }

  await persistMatchScores(opportunityId, opportunity.tenantId, aiRequestId, result)

  await updateAiRequest(aiRequestId, {
    status: 'completed',
    promptHash: result.promptHash,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    estimatedCost: result.estimatedCost,
    durationMs: Date.now() - startedAt,
    result: {
      match_count: result.matches.length,
      used_fallback: result.usedFallback,
      provider: result.provider,
      model: result.model,
    },
  })

  await notifyMatchCompleted(
    opportunity.tenantId,
    opportunityId,
    opportunity.title,
    actorId ?? null,
    result.matches.length
  )

  return {
    aiRequestId,
    status: 'completed' as const,
    matchCount: result.matches.length,
    usedFallback: result.usedFallback,
  }
}

export async function requestTalentMatch(input: {
  tenantId: string
  opportunityId: string
  actorId: string
  correlationId?: string
}) {
  await assertAiMatchingAllowed(input.tenantId)

  const opportunity = await fetchOpportunityContext(input.opportunityId)
  if (!opportunity || opportunity.tenantId !== input.tenantId) {
    throw new Error('OPPORTUNITY_NOT_FOUND')
  }

  const correlationId = input.correlationId ?? crypto.randomUUID()
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

  const aiRequestId = await createAiRequest({
    tenantId: input.tenantId,
    correlationId,
    provider: 'openai',
    model,
    requestType: 'talent_match',
    entityType: 'opportunity',
    entityId: input.opportunityId,
  })

  const idempotencyKey = `ai-match:${input.opportunityId}:${aiRequestId}`

  await emitEvent({
    tenantId: input.tenantId,
    eventType: 'ai.match_requested',
    aggregateType: 'opportunity',
    aggregateId: input.opportunityId,
    idempotencyKey,
    correlationId,
    actorId: input.actorId,
    payload: {
      opportunity_id: input.opportunityId,
      ai_request_id: aiRequestId,
    },
  })

  return { aiRequestId, correlationId, status: 'pending' as const }
}

export async function getTalentMatchResults(
  opportunityId: string,
  tenantId: string
): Promise<{
  scores: TalentMatchScoreRow[]
  latestRequest: {
    id: string
    status: string
    createdAt: string
    completedAt: string | null
    result: Record<string, unknown> | null
  } | null
}> {
  const supabase = createAdminClient()

  const { data: scores } = await supabase
    .from('talent_match_scores')
    .select('id, opportunity_id, freelancer_id, ai_request_id, score, rationale, skill_overlap, rank, created_at')
    .eq('opportunity_id', opportunityId)
    .eq('tenant_id', tenantId)
    .order('score', { ascending: false })

  const freelancerIds = [...new Set((scores ?? []).map((s) => s.freelancer_id))]
  const { data: freelancers } = freelancerIds.length
    ? await supabase
        .from('freelancers')
        .select('id, full_name, discipline, day_rate, availability, internal_rating')
        .in('id', freelancerIds)
    : { data: [] }

  const freelancerMap = new Map((freelancers ?? []).map((f) => [f.id, f]))

  const { data: latestRequest } = await supabase
    .from('ai_requests')
    .select('id, status, created_at, completed_at, result')
    .eq('tenant_id', tenantId)
    .eq('entity_type', 'opportunity')
    .eq('entity_id', opportunityId)
    .eq('request_type', 'talent_match')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const mappedScores: TalentMatchScoreRow[] = (scores ?? []).map((row) => {
    const freelancer = freelancerMap.get(row.freelancer_id)

    return {
      id: row.id,
      opportunityId: row.opportunity_id,
      freelancerId: row.freelancer_id,
      aiRequestId: row.ai_request_id,
      score: Number(row.score),
      rationale: row.rationale,
      skillOverlap: row.skill_overlap ?? [],
      rank: row.rank,
      createdAt: row.created_at,
      freelancer: freelancer
        ? {
            id: freelancer.id,
            full_name: freelancer.full_name,
            discipline: freelancer.discipline,
            day_rate: freelancer.day_rate,
            availability: freelancer.availability,
            internal_rating: freelancer.internal_rating,
          }
        : undefined,
    }
  })

  return {
    scores: mappedScores,
    latestRequest: latestRequest
      ? {
          id: latestRequest.id,
          status: latestRequest.status,
          createdAt: latestRequest.created_at,
          completedAt: latestRequest.completed_at,
          result: latestRequest.result as Record<string, unknown> | null,
        }
      : null,
  }
}
