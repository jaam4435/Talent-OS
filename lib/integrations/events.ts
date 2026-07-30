import { createAdminServices } from '@/lib/services/factory'
import type { EmitEventInput } from '@/lib/services/workflow.service'

export type { EmitEventInput }

/** Emit a domain or application event to the transactional outbox. */
export async function emitEvent(input: EmitEventInput): Promise<string | null> {
  const services = await createAdminServices()
  return services.eventPlatform.emitDomainEvent({
    tenantId: input.tenantId,
    eventType: input.eventType,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    idempotencyKey: input.idempotencyKey,
    payload: input.payload,
    actorId: input.actorId,
    correlationId: input.correlationId,
    scheduledAt: input.scheduledAt,
  })
}

export async function markEventProcessing(eventId: string) {
  const services = await createAdminServices()
  await services.workflow.markEventProcessing(eventId)
}

export async function markEventDelivered(eventId: string) {
  const services = await createAdminServices()
  await services.workflow.markEventDelivered(eventId)
}

export async function markEventFailed(eventId: string, error: string) {
  const services = await createAdminServices()
  await services.workflow.markEventFailed(eventId, error)
}
