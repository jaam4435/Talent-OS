import type { OrganizationContext, PlatformEventPayload, PlatformEventType } from '@/modules/platform/types'

export interface PlatformEmitInput {
  readonly eventType: PlatformEventType
  readonly aggregateType: string
  readonly aggregateId: string
  readonly idempotencyKey: string
  readonly context: OrganizationContext
  readonly data?: Record<string, unknown>
  readonly scheduledAt?: string
}

export interface IPlatformEventEmitter {
  emit(input: PlatformEmitInput): Promise<string | null>
}
