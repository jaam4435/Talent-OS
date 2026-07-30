import type { WorkflowService } from '@/lib/services/workflow.service'
import type { WhatsAppHandlerResult, WhatsAppIntent } from '@/lib/whatsapp/types'

/** Emit standardized workflow events after intent handling. */
export async function emitIntentHandledEvent(
  workflow: WorkflowService,
  input: {
    tenantId: string
    freelancerId: string
    userId: string | null
    waMessageId: string
    intent: WhatsAppIntent
    handler: WhatsAppHandlerResult
  }
): Promise<void> {
  if (!input.handler.handled || !input.handler.workflowEvent) return

  await workflow.emitEvent({
    tenantId: input.tenantId,
    eventType: 'whatsapp.intent_handled',
    aggregateType: 'freelancer',
    aggregateId: input.freelancerId,
    idempotencyKey: `whatsapp-intent:${input.waMessageId}:${input.intent}`,
    actorId: input.userId,
    payload: {
      intent: input.intent,
      workflow_event: input.handler.workflowEvent,
      ...(input.handler.data as Record<string, unknown>),
    },
  })
}

/** Trigger domain workflow by re-emitting the handler's workflow event type. */
export async function triggerHandlerWorkflow(
  workflow: WorkflowService,
  input: {
    tenantId: string
    freelancerId: string
    userId: string | null
    handler: WhatsAppHandlerResult
    aggregateId?: string
  }
): Promise<void> {
  if (!input.handler.handled || !input.handler.workflowEvent) return

  const aggregateId = input.aggregateId ?? input.freelancerId
  await workflow.emitEvent({
    tenantId: input.tenantId,
    eventType: input.handler.workflowEvent,
    aggregateType: 'freelancer',
    aggregateId,
    idempotencyKey: `whatsapp-wf:${input.handler.workflowEvent}:${aggregateId}:${Date.now()}`,
    actorId: input.userId,
    payload: input.handler.data as Record<string, unknown>,
  })
}
