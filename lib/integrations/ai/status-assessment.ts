import { createAdminClient } from '@/lib/supabase/admin'
import { emitEvent } from '@/lib/integrations/events'
import {
  assertAiFeatureAllowed,
  createAiRequest,
  updateAiRequest,
} from '@/lib/integrations/ai/governance'
import { callOpenAiStructured } from '@/lib/integrations/ai/openai-client'
import {
  STATUS_ASSESSMENT_SCHEMA,
  buildStatusAssessmentPrompt,
} from '@/lib/integrations/ai/prompt-pm'
import type { StatusAssessmentResult } from '@/lib/integrations/ai/types'

function ruleBasedStatusAssessment(context: {
  status: string
  overdueCount: number
  submittedCount: number
  revisionCount: number
}): StatusAssessmentResult {
  let riskLevel: StatusAssessmentResult['riskLevel'] = 'on_track'
  const reasons: string[] = []

  if (context.overdueCount > 0) {
    riskLevel = 'at_risk'
    reasons.push(`${context.overdueCount} milestone(s) overdue`)
  }
  if (context.revisionCount > 0) {
    riskLevel = 'at_risk'
    reasons.push(`${context.revisionCount} milestone(s) in revision`)
  }
  if (context.submittedCount > 0) {
    reasons.push(`${context.submittedCount} milestone(s) awaiting manager review`)
  }

  let suggestedStatus: string | null = null
  if (context.submittedCount > 0 && context.status === 'active') {
    suggestedStatus = 'in_review'
  }

  return {
    riskLevel,
    suggestedStatus,
    narrative: reasons.length
      ? `Project needs attention: ${reasons.join('; ')}.`
      : 'Project milestones are progressing without major blockers.',
    reasons,
    provider: 'openai',
    model: 'rule-based-fallback',
    usedFallback: true,
  }
}

async function fetchStatusContext(projectId: string) {
  const supabase = createAdminClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id, tenant_id, title, status, description')
    .eq('id', projectId)
    .maybeSingle()

  if (!project) return null

  const { data: milestones } = await supabase
    .from('milestones')
    .select('title, status, due_date, submitted_at')
    .eq('project_id', projectId)
    .order('sort_order')

  const { data: activity } = await supabase
    .from('activity_logs')
    .select('action, metadata, created_at')
    .eq('entity_type', 'project')
    .eq('entity_id', projectId)
    .order('created_at', { ascending: false })
    .limit(10)

  const now = new Date()
  const overdueCount =
    milestones?.filter(
      (m) =>
        m.due_date &&
        new Date(m.due_date) < now &&
        !['approved', 'canceled'].includes(m.status)
    ).length ?? 0

  return {
    project,
    milestones: milestones ?? [],
    activity: activity ?? [],
    overdueCount,
    submittedCount: milestones?.filter((m) => m.status === 'submitted').length ?? 0,
    revisionCount: milestones?.filter((m) => m.status === 'revision').length ?? 0,
  }
}

export async function generateStatusAssessment(projectId: string): Promise<StatusAssessmentResult> {
  const context = await fetchStatusContext(projectId)
  if (!context) throw new Error('PROJECT_NOT_FOUND')

  try {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured')

    const { system, user } = buildStatusAssessmentPrompt({
      project: context.project,
      milestones: context.milestones,
      recent_activity: context.activity,
      overdue_count: context.overdueCount,
    })

    const { data, model } = await callOpenAiStructured<{
      risk_level: 'on_track' | 'at_risk' | 'blocked'
      suggested_status: string | null
      narrative: string
      reasons: string[]
    }>({
      system,
      user,
      schema: STATUS_ASSESSMENT_SCHEMA,
    })

    return {
      riskLevel: data.risk_level,
      suggestedStatus: data.suggested_status,
      narrative: data.narrative,
      reasons: data.reasons ?? [],
      provider: 'openai',
      model,
      usedFallback: false,
    }
  } catch {
    return ruleBasedStatusAssessment({
      status: context.project.status,
      overdueCount: context.overdueCount,
      submittedCount: context.submittedCount,
      revisionCount: context.revisionCount,
    })
  }
}

export async function executeStatusAssessment(aiRequestId: string, actorId?: string | null) {
  const supabase = createAdminClient()
  const startedAt = Date.now()

  const { data: aiRequest } = await supabase
    .from('ai_requests')
    .select('*')
    .eq('id', aiRequestId)
    .maybeSingle()

  if (!aiRequest) throw new Error('AI_REQUEST_NOT_FOUND')
  if (aiRequest.status === 'completed') return { aiRequestId, status: 'completed' as const, skipped: true }

  const projectId = aiRequest.entity_id
  if (!projectId) throw new Error('INVALID_AI_REQUEST')

  await updateAiRequest(aiRequestId, { status: 'processing' })

  const result = await generateStatusAssessment(projectId)

  await supabase
    .from('projects')
    .update({
      ai_status_assessment: {
        risk_level: result.riskLevel,
        suggested_status: result.suggestedStatus,
        narrative: result.narrative,
        reasons: result.reasons,
        assessed_at: new Date().toISOString(),
      },
    })
    .eq('id', projectId)

  await updateAiRequest(aiRequestId, {
    status: 'completed',
    durationMs: Date.now() - startedAt,
    result: {
      risk_level: result.riskLevel,
      suggested_status: result.suggestedStatus,
      narrative: result.narrative,
      reasons: result.reasons,
      used_fallback: result.usedFallback,
      provider: result.provider,
      model: result.model,
    },
  })

  if (result.riskLevel !== 'on_track' && actorId) {
    await supabase.from('notifications').insert({
      tenant_id: aiRequest.tenant_id,
      user_id: actorId,
      type: 'system',
      title: 'Project status alert',
      body: result.narrative,
      data: {
        project_id: projectId,
        risk_level: result.riskLevel,
        kind: 'ai_status_assessment',
      },
    })
  }

  return { aiRequestId, status: 'completed' as const, assessment: result }
}

export async function requestStatusAssessment(input: {
  tenantId: string
  projectId: string
  actorId: string
}) {
  await assertAiFeatureAllowed(input.tenantId, 'status_assessment')

  const supabase = createAdminClient()
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', input.projectId)
    .eq('tenant_id', input.tenantId)
    .maybeSingle()

  if (!project) throw new Error('PROJECT_NOT_FOUND')

  const correlationId = crypto.randomUUID()
  const aiRequestId = await createAiRequest({
    tenantId: input.tenantId,
    correlationId,
    provider: 'openai',
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    requestType: 'status_assessment',
    entityType: 'project',
    entityId: input.projectId,
  })

  await emitEvent({
    tenantId: input.tenantId,
    eventType: 'ai.status_assessment_requested',
    aggregateType: 'project',
    aggregateId: input.projectId,
    idempotencyKey: `ai-status-assessment:${input.projectId}:${aiRequestId}`,
    correlationId,
    actorId: input.actorId,
    payload: {
      project_id: input.projectId,
      ai_request_id: aiRequestId,
    },
  })

  return { aiRequestId, status: 'pending' as const }
}

export async function getStatusAssessmentResult(projectId: string, tenantId: string) {
  const supabase = createAdminClient()

  const { data: project } = await supabase
    .from('projects')
    .select('ai_status_assessment, status')
    .eq('id', projectId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const { data: latestRequest } = await supabase
    .from('ai_requests')
    .select('id, status, created_at, completed_at, result')
    .eq('tenant_id', tenantId)
    .eq('entity_type', 'project')
    .eq('entity_id', projectId)
    .eq('request_type', 'status_assessment')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    assessment: project?.ai_status_assessment as Record<string, unknown> | null,
    currentStatus: project?.status ?? null,
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

export async function processOverdueMilestones() {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const { data: overdue } = await supabase
    .from('milestones')
    .select('id, title, project_id, tenant_id, due_date')
    .lt('due_date', now.split('T')[0])
    .in('status', ['pending', 'in_progress', 'revision', 'submitted'])

  const results: Array<{ milestoneId: string; ok: boolean }> = []

  for (const milestone of overdue ?? []) {
    const idempotencyKey = `milestone-overdue:${milestone.id}:${milestone.due_date}`

    const { data: existing } = await supabase
      .from('domain_events')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (existing) {
      results.push({ milestoneId: milestone.id, ok: true })
      continue
    }

    const { data: project } = await supabase
      .from('projects')
      .select('title, assigned_by, status')
      .eq('id', milestone.project_id)
      .maybeSingle()

    await emitEvent({
      tenantId: milestone.tenant_id,
      eventType: 'milestone.overdue',
      aggregateType: 'milestone',
      aggregateId: milestone.id,
      idempotencyKey,
      payload: {
        milestone_id: milestone.id,
        project_id: milestone.project_id,
        project_title: project?.title,
        due_date: milestone.due_date,
      },
    })

    await supabase.from('activity_logs').insert({
      tenant_id: milestone.tenant_id,
      actor_id: null,
      entity_type: 'milestone',
      entity_id: milestone.id,
      action: 'overdue',
      metadata: {
        project_id: milestone.project_id,
        due_date: milestone.due_date,
      },
    })

    if (project?.assigned_by) {
      await supabase.from('notifications').insert({
        tenant_id: milestone.tenant_id,
        user_id: project.assigned_by,
        type: 'system',
        title: 'Milestone overdue',
        body: `"${milestone.title}" on ${project.title} is past due.`,
        data: {
          project_id: milestone.project_id,
          milestone_id: milestone.id,
          kind: 'milestone_overdue',
        },
      })
    }

    results.push({ milestoneId: milestone.id, ok: true })
  }

  return { processed: results.length, results }
}
