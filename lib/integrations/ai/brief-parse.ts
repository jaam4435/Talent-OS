import { createAdminClient } from '@/modules/core/utils/supabase/admin'
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
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured')
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
  const supabase = createAdminClient()
  await supabase
    .from('opportunities')
    .update({ requirements })
    .eq('id', opportunityId)
}

export async function executeBriefParse(aiRequestId: string) {
  const supabase = createAdminClient()
  const startedAt = Date.now()

  const { data: aiRequest } = await supabase
    .from('ai_requests')
    .select('*')
    .eq('id', aiRequestId)
    .maybeSingle()

  if (!aiRequest) throw new Error('AI_REQUEST_NOT_FOUND')
  if (aiRequest.status === 'completed') return { aiRequestId, status: 'completed' as const, skipped: true }

  const opportunityId = aiRequest.entity_id
  if (!opportunityId) throw new Error('INVALID_AI_REQUEST')

  await updateAiRequest(aiRequestId, { status: 'processing' })

  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('id, tenant_id, title, description, budget, currency')
    .eq('id', opportunityId)
    .maybeSingle()

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

  const supabase = createAdminClient()
  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('id, tenant_id')
    .eq('id', input.opportunityId)
    .eq('tenant_id', input.tenantId)
    .maybeSingle()

  if (!opportunity) throw new Error('OPPORTUNITY_NOT_FOUND')

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
  const supabase = createAdminClient()

  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('requirements')
    .eq('id', opportunityId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const { data: latestRequest } = await supabase
    .from('ai_requests')
    .select('id, status, created_at, completed_at, result')
    .eq('tenant_id', tenantId)
    .eq('entity_type', 'opportunity')
    .eq('entity_id', opportunityId)
    .eq('request_type', 'brief_parse')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    requirements:
      opportunity?.requirements &&
      typeof opportunity.requirements === 'object' &&
      Object.keys(opportunity.requirements as object).length
        ? (opportunity.requirements as unknown as ParsedRequirements)
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
