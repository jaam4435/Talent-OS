import type { Repositories } from '@/lib/repositories/factory'
import { findCatalogEntry } from '@/lib/events/catalog'
import type { EmitApplicationEventInput, EmitDomainEventInput, RecordIntegrationEventInput } from '@/lib/events/types'

/** Unified event emission — domain + application events via outbox; integration via webhook audit. */
export class EventPlatformService {
  constructor(private readonly repos: Repositories) {}

  async emitDomainEvent(input: EmitDomainEventInput): Promise<string | null> {
    const catalog = findCatalogEntry(input.eventType)
    if (catalog && catalog.category === 'integration') {
      throw new Error(`Event ${input.eventType} is an integration event — use recordIntegrationEvent()`)
    }

    return this.repos.domainEvent.emit({
      tenantId: input.tenantId,
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      idempotencyKey: input.idempotencyKey,
      payload: {
        ...(input.payload ?? {}),
        _event_category: catalog?.category ?? 'domain',
      },
      actorId: input.actorId,
      correlationId: input.correlationId,
      scheduledAt: input.scheduledAt,
    })
  }

  async emitApplicationEvent(input: EmitApplicationEventInput): Promise<string | null> {
    return this.emitDomainEvent({
      ...input,
      payload: {
        ...(input.payload ?? {}),
        _application_scope: input.applicationScope,
        _event_category: 'application',
      },
    })
  }

  async recordIntegrationEvent(input: RecordIntegrationEventInput): Promise<{ duplicate: boolean }> {
    const existing = await this.repos.webhookDelivery.findByIdempotency(input.source, input.idempotencyKey)
    if (existing) return { duplicate: true }

    await this.repos.webhookDelivery.create({
      tenant_id: input.tenantId,
      source: input.source,
      idempotency_key: input.idempotencyKey,
      correlation_id: input.correlationId,
      event_type: input.eventType,
      payload: input.payload as never,
      status: 'received',
    })

    return { duplicate: false }
  }

  async recordProcessingFingerprint(eventId: string, processor = 'dispatch-worker') {
    return this.repos.domainEvent.recordFingerprint(eventId, processor)
  }

  async finalizeEventIfComplete(eventId: string) {
    return this.repos.domainEvent.finalizeIfComplete(eventId)
  }

  async listDeadLetterEvents(tenantId: string, limit = 50) {
    return this.repos.domainEvent.listDeadLetter(tenantId, limit)
  }

  async listDeadLetterJobs(tenantId: string, limit = 50) {
    return this.repos.workflow.listDeadLetterJobs(tenantId, limit)
  }

  async retryDeadLetterEvents(eventIds: string[]) {
    return this.repos.workflow.retryFailedEvents(eventIds)
  }

  async retryDeadLetterJobs(jobIds: string[]) {
    return this.repos.workflow.retryFailedJobs(jobIds)
  }
}
