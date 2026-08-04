import type { IPlatformEventEmitter, PlatformEmitInput } from '@/modules/platform/contracts/event-emitter'
import type { PlatformEventEmitFn } from '@/modules/platform/events/types'

export class PlatformEventEmitter implements IPlatformEventEmitter {
  constructor(private readonly emitFn: PlatformEventEmitFn) {}

  async emit(input: PlatformEmitInput): Promise<string | null> {
    const { context, data, ...rest } = input

    return this.emitFn({
      tenantId: context.organizationId,
      eventType: rest.eventType,
      aggregateType: rest.aggregateType,
      aggregateId: rest.aggregateId,
      idempotencyKey: rest.idempotencyKey,
      actorId: context.userId,
      correlationId: context.correlationId,
      scheduledAt: rest.scheduledAt,
      payload: {
        productId: context.productId,
        organizationId: context.organizationId,
        correlationId: context.correlationId,
        requestId: context.requestId,
        actorId: context.userId,
        ...data,
      },
    })
  }
}

export function createPlatformEventEmitter(emitFn: PlatformEventEmitFn): PlatformEventEmitter {
  return new PlatformEventEmitter(emitFn)
}

/** Default emitter wrapping the domain outbox integration. */
export async function createDefaultPlatformEventEmitter(): Promise<PlatformEventEmitter> {
  const { emitEvent } = await import('@/lib/integrations/events')
  return createPlatformEventEmitter((input) => emitEvent(input))
}
