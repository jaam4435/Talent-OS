import { getAiGateway } from '@/lib/ai'
import { createAdminServices } from '@/lib/services/factory'
import { emitEvent } from '@/lib/integrations/events'
import {
  assertAiMatchingAllowed,
  beginAiExecution,
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
  const services = await createAdminServices()
  const data = await services.crm.getMatchContext(opportunityId)
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
  const services = await createAdminServices()
  const excludedIds = await services.crm.listRecipientFreelancerIds(opportunity.id)
  const freelancers = await services.talent.listMatchCandidates(opportunity.tenantId, {
    discipline: opportunity.discipline,
    excludedIds,
  })

  return freelancers.map((f) => ({
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
  const services = await createAdminServices()
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

  await services.assignment.upsertMatchScores(rows)
}

async function notifyMatchCompleted(
  tenantId: string,
  opportunityId: string,
  opportunityTitle: string,
  actorId: string | null,
  matchCount: number
) {
  if (!actorId) return

  const services = await createAdminServices()
  await services.notification.create({
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
  const services = await createAdminServices()
  const startedAt = Date.now()
  const aiRequest = await services.ai.findById(aiRequestId)

  if (!aiRequest) {
    throw new Error('AI_REQUEST_NOT_FOUND')
  }

  const gate = await beginAiExecution(aiRequestId)
  if (!gate.proceed) {
    if (gate.reason === 'not_found') throw new Error('AI_REQUEST_NOT_FOUND')
    return { aiRequestId, status: 'completed' as const, skipped: true }
  }

  const opportunityId = aiRequest.entity_id
  if (!opportunityId || aiRequest.request_type !== 'talent_match') {
    throw new Error('INVALID_AI_REQUEST')
  }

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
    if (getAiGateway().isConfigured()) {
      result = await rankTalentWithOpenAi(opportunity, candidates)
    } else {
      throw new Error('No AI providers configured')
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

function mapLatestRequest(
  latestRequest: {
    id: string
    status: string
    created_at: string
    completed_at: string | null
    result: unknown
  } | null
) {
  return latestRequest
    ? {
        id: latestRequest.id,
        status: latestRequest.status,
        createdAt: latestRequest.created_at,
        completedAt: latestRequest.completed_at,
        result: latestRequest.result as Record<string, unknown> | null,
      }
    : null
}

export async function getTalentMatchResults(
  opportunityId: string,
  tenantId: string
): Promise<{
  scores: TalentMatchScoreRow[]
  latestRequest: ReturnType<typeof mapLatestRequest>
}> {
  const services = await createAdminServices()
  const scores = await services.assignment.listDetailedMatchScores(opportunityId, tenantId)
  const freelancerIds = [...new Set(scores.map((s) => s.freelancer_id))]
  const freelancers = freelancerIds.length
    ? await services.talent.findByIds(
        freelancerIds,
        'id, full_name, discipline, day_rate, availability, internal_rating'
      )
    : []

  const freelancerMap = new Map(freelancers.map((f) => [f.id as string, f]))
  const latestRequest = await services.ai.findLatestByEntity({
    tenantId,
    entityType: 'opportunity',
    entityId: opportunityId,
    requestType: 'talent_match',
  })

  const mappedScores: TalentMatchScoreRow[] = scores.map((row) => {
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
            id: freelancer.id as string,
            full_name: freelancer.full_name as string,
            discipline: freelancer.discipline as string,
            day_rate: freelancer.day_rate as number | null,
            availability: freelancer.availability as string,
            internal_rating: freelancer.internal_rating as number | null,
          }
        : undefined,
    }
  })

  return {
    scores: mappedScores,
    latestRequest: mapLatestRequest(latestRequest),
  }
}
