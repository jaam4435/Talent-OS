import { getAiGateway } from '@/lib/ai'
import { createAdminServices } from '@/lib/services/factory'
import { emitEvent } from '@/lib/integrations/events'
import {
  assertAiFeatureAllowed,
  beginAiExecution,
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
  const services = await createAdminServices()
  return services.project.findStatusContext(projectId)
}

export async function generateStatusAssessment(projectId: string): Promise<StatusAssessmentResult> {
  const context = await fetchStatusContext(projectId)
  if (!context) throw new Error('PROJECT_NOT_FOUND')

  try {
    if (!getAiGateway().isConfigured()) throw new Error('No AI providers configured')

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
  const services = await createAdminServices()
  const startedAt = Date.now()
  const aiRequest = await services.ai.findById(aiRequestId)

  if (!aiRequest) throw new Error('AI_REQUEST_NOT_FOUND')

  const gate = await beginAiExecution(aiRequestId)
  if (!gate.proceed) {
    if (gate.reason === 'not_found') throw new Error('AI_REQUEST_NOT_FOUND')
    return { aiRequestId, status: 'completed' as const, skipped: true }
  }

  const projectId = aiRequest.entity_id
  if (!projectId) throw new Error('INVALID_AI_REQUEST')

  const result = await generateStatusAssessment(projectId)

  await services.project.updateStatusAssessment(projectId, {
    risk_level: result.riskLevel,
    suggested_status: result.suggestedStatus,
    narrative: result.narrative,
    reasons: result.reasons,
    assessed_at: new Date().toISOString(),
  })

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
    await services.notification.create({
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

  const services = await createAdminServices()
  const project = await services.project.findById(input.projectId, input.tenantId)
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
  const services = await createAdminServices()
  const project = await services.project.findAiFields(projectId, tenantId)
  const latestRequest = await services.ai.findLatestByEntity({
    tenantId,
    entityType: 'project',
    entityId: projectId,
    requestType: 'status_assessment',
  })

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
  const services = await createAdminServices()
  const now = new Date().toISOString()
  const overdue = await services.workflow.listOverdueMilestones(now)
  const results: Array<{ milestoneId: string; ok: boolean }> = []

  for (const milestone of overdue) {
    const idempotencyKey = `milestone-overdue:${milestone.id}:${milestone.due_date}`
    const existing = await services.workflow.findEventByIdempotencyKey(idempotencyKey)

    if (existing) {
      results.push({ milestoneId: milestone.id, ok: true })
      continue
    }

    const project = await services.project.findAssignedBy(milestone.project_id)

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

    await services.workflow.logActivity({
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
      await services.notification.create({
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
