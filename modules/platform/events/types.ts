import type { PlatformEventPayload, PlatformEventType } from '@/modules/platform/types'

export interface PlatformDomainEventEnvelope {
  readonly eventType: PlatformEventType
  readonly aggregateType: string
  readonly aggregateId: string
  readonly payload: PlatformEventPayload & Record<string, unknown>
}

export type PlatformEventEmitFn = (input: {
  tenantId: string
  eventType: string
  aggregateType: string
  aggregateId: string
  idempotencyKey: string
  payload?: Record<string, unknown>
  actorId?: string | null
  correlationId?: string
  scheduledAt?: string
}) => Promise<string | null>
