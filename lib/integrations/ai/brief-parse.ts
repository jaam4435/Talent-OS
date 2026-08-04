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
  BRIEF_PARSE_SCHEMA,
  buildBriefParsePrompt,
} from '@/lib/integrations/ai/prompt-pm'
import type { BriefParseResult, ParsedRequirements } from '@/lib/integrations/ai/types'

const SKILL_KEYWORDS = [
  'figma',
  'photoshop',
  'illustrator',
  'after effects',
  'premiere',
  'copywriting',
  'branding',
  'ui',
  'ux',
  'video',
  'motion',
  'animation',
  'react',
  'typescript',
  'javascript',
  'html',
  'css',
  'wordpress',
  'seo',
  'social media',
]

function ruleBasedBriefParse(input: {
  title: string
  description: string | null
  budget?: number | null
}): BriefParseResult {
  const text = `${input.title} ${input.description ?? ''}`.toLowerCase()
  const skills = SKILL_KEYWORDS.filter((keyword) => text.includes(keyword))

  const deliverables = input.description
    ? input.description
        .split(/[.\n]/)
        .map((line) => line.trim())
        .filter((line) => line.length > 12)
        .slice(0, 4)
    : []

  const requirements: ParsedRequirements = {
    skills: skills.length ? skills : ['general'],
    deliverables: deliverables.length ? deliverables : ['Deliver final creative assets'],
    suggestedMilestones: [
      { title: 'Discovery & planning', description: 'Align on scope and timeline' },
      { title: 'First draft delivery', description: 'Initial creative delivery for review' },
      { title: 'Final delivery', description: 'Revisions and handoff' },
    ],
    budgetHint: input.budget ?? null,
    timelineHint: null,
    risks: deliverables.length ? [] : ['Brief may need more detail before assignment'],
    summary: input.description?.slice(0, 280) ?? input.title,
  }

  return {
    requirements,
    provider: 'openai',
    model: 'rule-based-fallback',
    usedFallback: true,
  }
}

export async function parseBriefText(input: {
  title: string
  description?: string | null
  budget?: number | null
  currency?: string
}): Promise<BriefParseResult> {
  try {
    if (!getAiGateway().isConfigured()) {
      throw new Error('No AI providers configured')
    }

    const { system, user } = buildBriefParsePrompt({
      title: input.title,
      description: input.description ?? null,
      budget: input.budget ?? null,
      currency: input.currency,
    })

    const { data, model, inputTokens, outputTokens, estimatedCost, promptHash } =
      await callOpenAiStructured<{
        skills: string[]
        deliverables: string[]
        suggested_milestones: Array<{ title: string; description: string }>
        budget_hint: number | null
        timeline_hint: string | null
        risks: string[]
        summary: string
      }>({
        system,
        user,
        schema: BRIEF_PARSE_SCHEMA,
      })

    void promptHash

    return {
      requirements: {
        skills: data.skills ?? [],
        deliverables: data.deliverables ?? [],
        suggestedMilestones: (data.suggested_milestones ?? []).map((m) => ({
          title: m.title,
          description: m.description,
        })),
        budgetHint: data.budget_hint,
        timelineHint: data.timeline_hint,
        risks: data.risks ?? [],
        summary: data.summary,
      },
      provider: 'openai',
      model,
      inputTokens,
      outputTokens,
      estimatedCost,
      usedFallback: false,
    }
  } catch {
    return ruleBasedBriefParse({
      title: input.title,
      description: input.description ?? null,
      budget: input.budget ?? null,
    })
  }
}

async function persistOpportunityRequirements(opportunityId: string, requirements: ParsedRequirements) {
  const services = await createAdminServices()
  await services.crm.updateRequirements(opportunityId, requirements)
}

export async function executeBriefParse(aiRequestId: string) {
  const services = await createAdminServices()
  const startedAt = Date.now()
  const aiRequest = await services.ai.findById(aiRequestId)

  if (!aiRequest) throw new Error('AI_REQUEST_NOT_FOUND')
  if (aiRequest.status === 'completed') return { aiRequestId, status: 'completed' as const, skipped: true }

  const opportunityId = aiRequest.entity_id
  if (!opportunityId) throw new Error('INVALID_AI_REQUEST')

  await updateAiRequest(aiRequestId, { status: 'processing' })

  const opportunity = await services.crm.findBriefContext(opportunityId)

  if (!opportunity) {
    await updateAiRequest(aiRequestId, { status: 'failed', errorMessage: 'Opportunity not found' })
    throw new Error('OPPORTUNITY_NOT_FOUND')
  }

  const result = await parseBriefText({
    title: opportunity.title,
    description: opportunity.description,
    budget: opportunity.budget ? Number(opportunity.budget) : null,
    currency: opportunity.currency,
  })

  await persistOpportunityRequirements(opportunityId, result.requirements)

  await updateAiRequest(aiRequestId, {
    status: 'completed',
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    estimatedCost: result.estimatedCost,
    durationMs: Date.now() - startedAt,
    result: {
      requirements: result.requirements,
      used_fallback: result.usedFallback,
      provider: result.provider,
      model: result.model,
    },
  })

  return { aiRequestId, status: 'completed' as const }
}

export async function requestBriefParse(input: {
  tenantId: string
  opportunityId: string
  actorId: string
}) {
  await assertAiFeatureAllowed(input.tenantId, 'brief_parse')

  const services = await createAdminServices()
  const exists = await services.crm.existsInTenant(input.opportunityId, input.tenantId)
  if (!exists) throw new Error('OPPORTUNITY_NOT_FOUND')

  const correlationId = crypto.randomUUID()
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

  const aiRequestId = await createAiRequest({
    tenantId: input.tenantId,
    correlationId,
    provider: 'openai',
    model,
    requestType: 'brief_parse',
    entityType: 'opportunity',
    entityId: input.opportunityId,
  })

  await emitEvent({
    tenantId: input.tenantId,
    eventType: 'ai.brief_parse_requested',
    aggregateType: 'opportunity',
    aggregateId: input.opportunityId,
    idempotencyKey: `ai-brief-parse:${input.opportunityId}:${aiRequestId}`,
    correlationId,
    actorId: input.actorId,
    payload: {
      opportunity_id: input.opportunityId,
      ai_request_id: aiRequestId,
    },
  })

  return { aiRequestId, correlationId, status: 'pending' as const }
}

export async function getBriefParseResult(opportunityId: string, tenantId: string) {
  const services = await createAdminServices()
  const requirementsRaw = await services.crm.findRequirements(opportunityId, tenantId)
  const latestRequest = await services.ai.findLatestByEntity({
    tenantId,
    entityType: 'opportunity',
    entityId: opportunityId,
    requestType: 'brief_parse',
  })

  return {
    requirements:
      requirementsRaw &&
      typeof requirementsRaw === 'object' &&
      Object.keys(requirementsRaw as object).length
        ? (requirementsRaw as unknown as ParsedRequirements)
        : null,
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
