/**
 * Event platform core types.
 * @see docs/Platform/EVENT_PLATFORM_IMPLEMENTATION.md
 */

/** Domain = aggregate state change. Application = cross-cutting orchestration. Integration = external system boundary. */
export type EventCategory = 'domain' | 'application' | 'integration'

export type EventDeliveryStatus =
  | 'pending'
  | 'processing'
  | 'delivered'
  | 'failed'
  | 'dead_letter'

export interface EventCatalogEntry {
  readonly type: string
  readonly category: EventCategory
  readonly domain: string
  readonly description: string
  readonly aggregateType: string
  readonly emitter: string
  readonly workflowId?: string
  readonly payloadKeys?: readonly string[]
  readonly idempotencyPattern?: string
  readonly status: 'production' | 'planned'
}

export interface EmitDomainEventInput {
  tenantId: string
  eventType: string
  aggregateType: string
  aggregateId: string
  idempotencyKey: string
  payload?: Record<string, unknown>
  actorId?: string | null
  correlationId?: string
  scheduledAt?: string
}

export interface EmitApplicationEventInput extends EmitDomainEventInput {
  applicationScope: string
}

export interface RecordIntegrationEventInput {
  source: string
  idempotencyKey: string
  eventType: string
  payload: Record<string, unknown>
  tenantId?: string
  correlationId?: string
}

export interface DeadLetterItem {
  id: string
  kind: 'domain_event' | 'workflow_job'
  tenantId: string
  eventType: string
  lastError: string | null
  retryCount: number
  createdAt: string
}
