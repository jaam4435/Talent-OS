import { getAiGateway } from '@/lib/ai'
import { createAdminServices } from '@/lib/services/factory'
import { emitEvent } from '@/lib/integrations/events'
import {
  assertAiFeatureAllowed,
  createAiRequest,
  updateAiRequest,
} from '@/lib/integrations/ai/governance'
import { callOpenAiStructured } from '@/lib/integrations/ai/openai-client'
import {
  PROJECT_SUMMARY_SCHEMA,
  SHORTLIST_SUMMARY_SCHEMA,
  buildProjectSummaryPrompt,
} from '@/lib/integrations/ai/prompt-pm'
import type { ProjectSummaryResult } from '@/lib/integrations/ai/types'

const SHORTLIST_SUMMARY_SYSTEM = `You are an AI project manager comparing shortlisted freelancers for a creative opportunity.
Summarize trade-offs and recommend the best fit based on scores, rates, ratings, and responses.`

function ruleBasedProjectSummary(context: {
  project: { title: string; status: string }
  milestones: Array<{ title: string; status: string; due_date: string | null }>
  overdueCount: number
}): ProjectSummaryResult {
  const pending = context.milestones.filter((m) => m.status === 'pending' || m.status === 'in_progress')
  const submitted = context.milestones.filter((m) => m.status === 'submitted')

  return {
    summaryText: `Project "${context.project.title}" is ${context.project.status}. ${pending.length} milestone(s) in progress, ${submitted.length} awaiting review.`,
    highlights: submitted.length ? ['Milestone work submitted and awaiting review'] : [],
    blockers: context.overdueCount
      ? [`${context.overdueCount} milestone(s) are overdue`]
      : [],
    nextActions: submitted.length
      ? ['Review submitted milestone(s)']
      : pending.length
        ? ['Follow up on active milestone progress']
        : ['Confirm next milestone scope'],
    provider: 'openai',
    model: 'rule-based-fallback',
    usedFallback: true,
  }
}

async function fetchProjectSummaryContext(projectId: string) {
  const services = await createAdminServices()
  return services.project.findSummaryContext(projectId)
}

export async function generateProjectSummary(
  projectId: string,
  options?: { tenantId?: string; aiRequestId?: string }
): Promise<ProjectSummaryResult> {
  const context = await fetchProjectSummaryContext(projectId)
  if (!context) throw new Error('PROJECT_NOT_FOUND')

  try {
    if (!getAiGateway().isConfigured()) throw new Error('No AI providers configured')

    const promptInput = {
      project: context.project,
      freelancer: context.freelancer,
      milestones: context.milestones,
      recent_activity: context.activity,
      overdue_count: context.overdueCount,
    }

    const { system, user } = buildProjectSummaryPrompt(promptInput)
    const { data, model } = await callOpenAiStructured<{
      summary_text: string
      highlights: string[]
      blockers: string[]
      next_actions: string[]
    }>({
      system,
      user,
      schema: PROJECT_SUMMARY_SCHEMA,
      tenantId: options?.tenantId,
      feature: 'project_summary',
      promptId: 'project_summary',
      promptVersion: '1.0.0',
      aiRequestId: options?.aiRequestId,
    })

    return {
      summaryText: data.summary_text,
      highlights: data.highlights ?? [],
      blockers: data.blockers ?? [],
      nextActions: data.next_actions ?? [],
      provider: 'openai',
      model,
      usedFallback: false,
    }
  } catch {
    return ruleBasedProjectSummary({
      project: { title: context.project.title, status: context.project.status },
      milestones: context.milestones.map((m) => ({
        title: m.title,
        status: m.status,
        due_date: m.due_date,
      })),
      overdueCount: context.overdueCount,
    })
  }
}

export async function executeProjectSummary(aiRequestId: string) {
  const services = await createAdminServices()
  const startedAt = Date.now()
  const aiRequest = await services.ai.findById(aiRequestId)

  if (!aiRequest) throw new Error('AI_REQUEST_NOT_FOUND')
  if (aiRequest.status === 'completed') return { aiRequestId, status: 'completed' as const, skipped: true }

  const projectId = aiRequest.entity_id
  if (!projectId) throw new Error('INVALID_AI_REQUEST')

  await updateAiRequest(aiRequestId, { status: 'processing' })

  const result = await generateProjectSummary(projectId, {
    tenantId: aiRequest.tenant_id,
    aiRequestId,
  })

  await services.project.updateAiSummary(projectId, {
    summary_text: result.summaryText,
    highlights: result.highlights,
    blockers: result.blockers,
    next_actions: result.nextActions,
    generated_at: new Date().toISOString(),
  })

  await updateAiRequest(aiRequestId, {
    status: 'completed',
    result: {
      summary_text: result.summaryText,
      highlights: result.highlights,
      blockers: result.blockers,
      next_actions: result.nextActions,
      used_fallback: result.usedFallback,
      provider: result.provider,
      model: result.model,
    },
  })

  return { aiRequestId, status: 'completed' as const }
}

export async function requestProjectSummary(input: {
  tenantId: string
  projectId: string
  actorId: string
}) {
  await assertAiFeatureAllowed(input.tenantId, 'project_summary')

  const services = await createAdminServices()
  const project = await services.project.findById(input.projectId, input.tenantId)
  if (!project) throw new Error('PROJECT_NOT_FOUND')

  const correlationId = crypto.randomUUID()
  const aiRequestId = await createAiRequest({
    tenantId: input.tenantId,
    correlationId,
    provider: 'openai',
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    requestType: 'project_summary',
    entityType: 'project',
    entityId: input.projectId,
  })

  await emitEvent({
    tenantId: input.tenantId,
    eventType: 'ai.summary_requested',
    aggregateType: 'project',
    aggregateId: input.projectId,
    idempotencyKey: `ai-project-summary:${input.projectId}:${aiRequestId}`,
    correlationId,
    actorId: input.actorId,
    payload: {
      project_id: input.projectId,
      ai_request_id: aiRequestId,
      summary_kind: 'project',
    },
  })

  return { aiRequestId, status: 'pending' as const }
}

export async function executeShortlistSummary(aiRequestId: string) {
  const services = await createAdminServices()
  const startedAt = Date.now()
  const aiRequest = await services.ai.findById(aiRequestId)

  if (!aiRequest) throw new Error('AI_REQUEST_NOT_FOUND')
  if (aiRequest.status === 'completed') return { aiRequestId, status: 'completed' as const, skipped: true }

  const opportunityId = aiRequest.entity_id
  if (!opportunityId) throw new Error('INVALID_AI_REQUEST')

  await updateAiRequest(aiRequestId, { status: 'processing' })

  const opportunity = await services.crm.findShortlistSummaryContext(opportunityId)
  const scores = await services.assignment.listTopMatchScores(opportunityId)
  const freelancerIds = scores.map((s) => s.freelancer_id)
  const freelancers = freelancerIds.length
    ? await services.talent.findByIds(
        freelancerIds,
        'id, full_name, discipline, day_rate, internal_rating'
      )
    : []

  const freelancerMap = new Map(freelancers.map((f) => [f.id as string, f]))

  let summaryText = 'No candidates available for comparison.'
  let comparisonPoints: string[] = []
  let recommendedId: string | null = null

  try {
    if (getAiGateway().isConfigured() && scores.length) {
      const promptInput = {
        opportunity,
        candidates: scores.map((s) => ({
          freelancer_id: s.freelancer_id,
          name: freelancerMap.get(s.freelancer_id)?.full_name,
          score: s.score,
          rationale: s.rationale,
          skill_overlap: s.skill_overlap,
          day_rate: freelancerMap.get(s.freelancer_id)?.day_rate,
          rating: freelancerMap.get(s.freelancer_id)?.internal_rating,
        })),
      }

      const { data } = await callOpenAiStructured<{
        summary_text: string
        recommended_freelancer_id: string | null
        comparison_points: string[]
      }>({
        system: SHORTLIST_SUMMARY_SYSTEM,
        user: JSON.stringify(promptInput, null, 2),
        schema: SHORTLIST_SUMMARY_SCHEMA,
        tenantId: aiRequest.tenant_id,
        feature: 'shortlist_summary',
        promptId: 'shortlist_summary',
        promptVersion: '1.0.0',
        aiRequestId,
      })

      summaryText = data.summary_text
      comparisonPoints = data.comparison_points ?? []
      recommendedId = data.recommended_freelancer_id
    } else if (scores.length) {
      const top = scores[0]
      recommendedId = top.freelancer_id
      summaryText = `Top match: ${freelancerMap.get(top.freelancer_id)?.full_name ?? 'Candidate'} with score ${top.score}.`
      comparisonPoints = scores.slice(0, 3).map((s) => {
        const name = freelancerMap.get(s.freelancer_id)?.full_name ?? 'Candidate'
        return `${name}: ${s.score} match score`
      })
    }
  } catch {
    const top = scores[0]
    if (top) {
      recommendedId = top.freelancer_id
      summaryText = `Top match: ${freelancerMap.get(top.freelancer_id)?.full_name ?? 'Candidate'}`
    }
  }

  await updateAiRequest(aiRequestId, {
    status: 'completed',
    result: {
      summary_text: summaryText,
      comparison_points: comparisonPoints,
      recommended_freelancer_id: recommendedId,
    },
  })

  return { aiRequestId, status: 'completed' as const }
}

export async function requestShortlistSummary(input: {
  tenantId: string
  opportunityId: string
  actorId: string
}) {
  await assertAiFeatureAllowed(input.tenantId, 'shortlist_summary')

  const correlationId = crypto.randomUUID()
  const aiRequestId = await createAiRequest({
    tenantId: input.tenantId,
    correlationId,
    provider: 'openai',
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    requestType: 'shortlist_summary',
    entityType: 'opportunity',
    entityId: input.opportunityId,
  })

  await emitEvent({
    tenantId: input.tenantId,
    eventType: 'ai.summary_requested',
    aggregateType: 'opportunity',
    aggregateId: input.opportunityId,
    idempotencyKey: `ai-shortlist-summary:${input.opportunityId}:${aiRequestId}`,
    correlationId,
    actorId: input.actorId,
    payload: {
      opportunity_id: input.opportunityId,
      ai_request_id: aiRequestId,
      summary_kind: 'shortlist',
    },
  })

  return { aiRequestId, status: 'pending' as const }
}

export async function getProjectSummaryResult(projectId: string, tenantId: string) {
  const services = await createAdminServices()
  const project = await services.project.findAiFields(projectId, tenantId)
  const latestRequest = await services.ai.findLatestByEntity({
    tenantId,
    entityType: 'project',
    entityId: projectId,
    requestType: 'project_summary',
  })

  return {
    summary: project?.ai_summary as Record<string, unknown> | null,
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

export async function getShortlistSummaryResult(opportunityId: string, tenantId: string) {
  const services = await createAdminServices()
  const latestRequest = await services.ai.findLatestByEntity({
    tenantId,
    entityType: 'opportunity',
    entityId: opportunityId,
    requestType: 'shortlist_summary',
  })

  return {
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
