import { describe, expect, it, vi } from 'vitest'
import { createPlatformEventEmitter } from '@/modules/platform/events/emitter'
import { createOrganizationContext } from '@/modules/platform/context/organization'
import type { ApiRequestContext } from '@/modules/core/api/context'
import { PLATFORM_EVENTS } from '@/modules/platform/events/catalog'
import { createPlatformClient } from '@/modules/platform/sdk/factory'
import { TALENT_OS_PRODUCT_ID } from '@/modules/platform/types'

const apiContext: ApiRequestContext = {
  requestId: 'req-1',
  correlationId: 'corr-1',
  apiVersion: 'v1',
  idempotencyKey: null,
  tenantId: 'tenant-abc',
  userId: 'user-1',
  role: 'admin',
  permissions: [],
  session: null,
  tenant: null,
}

describe('PlatformEventEmitter', () => {
  it('includes organizationId in payload', async () => {
    const emitFn = vi.fn(async () => 'event-1')
    const emitter = createPlatformEventEmitter(emitFn)
    const context = createOrganizationContext(apiContext)

    await emitter.emit({
      eventType: PLATFORM_EVENTS.CONFIG_UPDATED,
      aggregateType: 'platform_config',
      aggregateId: 'cfg-1',
      idempotencyKey: 'idem-1',
      context,
      data: { configKey: 'ai' },
    })

    expect(emitFn).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-abc',
        payload: expect.objectContaining({
          organizationId: 'tenant-abc',
          correlationId: 'corr-1',
        }),
      })
    )
  })
})

describe('createPlatformClient', () => {
  it('instantiates for Talent OS', () => {
    const client = createPlatformClient({ getContext: () => apiContext })
    expect(client.featureFlags).toBeDefined()
    expect(client.config).toBeDefined()
    expect(client.events).toBeDefined()
  })
})

describe('TALENT_OS_PRODUCT_ID', () => {
  it('is talent_os', () => {
    expect(TALENT_OS_PRODUCT_ID).toBe('talent_os')
  })
})
