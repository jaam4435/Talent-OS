import { buildN8nEnvelope, dispatchToN8n } from '@/lib/integrations/n8n'
import type { ActionExecutionContext, ActionResult } from '@/lib/workflows/types'
import type { Services } from '@/lib/services/factory'

const AI_EVENT_TYPES = new Set([
  'ai.match_requested',
  'ai.brief_parse_requested',
  'ai.summary_requested',
  'ai.status_assessment_requested',
])

export async function executeWorkflowAction(
  services: Services,
  ctx: ActionExecutionContext
): Promise<ActionResult> {
  switch (ctx.config.action ?? inferAction(ctx)) {
    case 'dispatch_n8n':
      return executeDispatchN8n(ctx)
    case 'execute_ai':
      return executeAi(services, ctx)
    case 'notify':
      return executeNotify(services, ctx)
    case 'emit_event':
      return executeEmitEvent(services, ctx)
    case 'log_activity':
      return executeLogActivity(services, ctx)
    case 'request_approval':
      return { ok: true, waitForApproval: true }
    default:
      return { ok: false, error: `Unknown action: ${ctx.config.action}` }
  }
}

function inferAction(ctx: ActionExecutionContext): string {
  if (AI_EVENT_TYPES.has(ctx.eventType)) return 'execute_ai'
  return 'dispatch_n8n'
}

async function executeDispatchN8n(ctx: ActionExecutionContext): Promise<ActionResult> {
  const envelope = buildN8nEnvelope({
    event: ctx.eventType,
    tenantId: ctx.tenantId,
    data: ctx.payload,
    idempotencyKey: ctx.idempotencyKey,
    correlationId: ctx.correlationId,
    actorId: ctx.actorId,
  })

  const result = await dispatchToN8n(envelope)
  if (!result.ok) {
    return { ok: false, error: result.error ?? `HTTP ${result.status}` }
  }

  return { ok: true, output: { status: result.status } }
}

async function executeAi(services: Services, ctx: ActionExecutionContext): Promise<ActionResult> {
  const aiRequestId = ctx.payload.ai_request_id
  if (typeof aiRequestId !== 'string') {
    return { ok: false, error: 'Missing ai_request_id in payload' }
  }

  const directMode = process.env.AI_EXECUTION_MODE === 'direct'
  if (!directMode) {
    return executeDispatchN8n(ctx)
  }

  try {
    await services.ai.executeRequest(aiRequestId, ctx.actorId)
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'AI execution failed',
    }
  }
}

async function executeNotify(services: Services, ctx: ActionExecutionContext): Promise<ActionResult> {
  const userId = ctx.payload.user_id ?? ctx.payload.created_by ?? ctx.actorId
  if (typeof userId !== 'string') {
    return { ok: true, output: { skipped: true, reason: 'no_recipient' } }
  }

  const type = (ctx.config.type as string) ?? 'system'
  const title = (ctx.config.title as string) ?? defaultNotifyTitle(ctx.eventType)
  const body = (ctx.config.body as string) ?? defaultNotifyBody(ctx)

  await services.notification.create({
    tenant_id: ctx.tenantId,
    user_id: userId,
    type,
    title,
    body,
    data: {
      ...ctx.payload,
      workflow_run_id: ctx.runId,
      event_type: ctx.eventType,
    },
  })

  return { ok: true }
}

async function executeEmitEvent(services: Services, ctx: ActionExecutionContext): Promise<ActionResult> {
  const eventType = (ctx.config.eventType as string) ?? ctx.eventType
  await services.workflow.emitEvent({
    tenantId: ctx.tenantId,
    eventType,
    aggregateType: ctx.aggregateType,
    aggregateId: ctx.aggregateId,
    idempotencyKey: `${eventType}:${ctx.aggregateId}:${ctx.runId}`,
    payload: ctx.payload,
    actorId: ctx.actorId,
    correlationId: ctx.correlationId,
  })
  return { ok: true }
}

async function executeLogActivity(services: Services, ctx: ActionExecutionContext): Promise<ActionResult> {
  await services.workflow.logActivity({
    tenant_id: ctx.tenantId,
    actor_id: ctx.actorId,
    entity_type: ctx.aggregateType,
    entity_id: ctx.aggregateId,
    action: (ctx.config.action as string) ?? ctx.eventType,
    metadata: ctx.payload,
  })
  return { ok: true }
}

function defaultNotifyTitle(eventType: string): string {
  const titles: Record<string, string> = {
    'opportunity.response': 'New opportunity response',
    'milestone.overdue': 'Milestone overdue',
    'milestone.approved': 'Milestone approved',
    'milestone.revision_requested': 'Revision requested',
    'payment.paid': 'Payment processed',
  }
  return titles[eventType] ?? 'Workflow notification'
}

function defaultNotifyBody(ctx: ActionExecutionContext): string {
  if (ctx.payload.project_title && ctx.payload.milestone_title) {
    return `"${ctx.payload.milestone_title}" on ${ctx.payload.project_title}`
  }
  if (ctx.payload.title) return String(ctx.payload.title)
  return `Event: ${ctx.eventType}`
}
