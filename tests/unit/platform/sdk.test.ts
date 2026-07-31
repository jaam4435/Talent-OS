import { describe, expect, it, vi } from 'vitest'
import { createPlatformEventEmitter } from '@/modules/platform/events/emitter'
import { createOrganizationContext } from '@/modules/platform/context/organization'
import type { ApiRequestContext } from '@/modules/core/api/context'
import { PLATFORM_EVENTS } from '@/modules/platform/events/catalog'
import { createPlatformClient } from '@/modules/platform/sdk/factory'
import { isProductId } from '@/modules/platform/types'

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
  it('includes productId and organizationId in payload', async () => {
    const emitFn = vi.fn(async () => 'event-1')
    const emitter = createPlatformEventEmitter(emitFn)
    const context = createOrganizationContext('talent_os', apiContext)

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
        correlationId: 'corr-1',
        payload: expect.objectContaining({
          productId: 'talent_os',
          organizationId: 'tenant-abc',
          correlationId: 'corr-1',
          configKey: 'ai',
        }),
      })
    )
  })
})

describe('createPlatformClient', () => {
  it('instantiates for talent_os', () => {
    const client = createPlatformClient({
      productId: 'talent_os',
      getContext: () => apiContext,
    })

    expect(client.productId).toBe('talent_os')
    expect(client.products.isEnabled('talent_os')).toBe(true)
    expect(client.featureFlags).toBeDefined()
    expect(client.config).toBeDefined()
    expect(client.events).toBeDefined()
  })

  it('rejects disabled products at SDK boundary', () => {
    expect(() =>
      createPlatformClient({
        productId: 'media_intel',
        getContext: () => apiContext,
      })
    ).toThrow('Product media_intel is not enabled')
  })

  it('allows disabled products when skipEnabledCheck is set', () => {
    const client = createPlatformClient(
      {
        productId: 'media_intel',
        getContext: () => apiContext,
        skipEnabledCheck: true,
      }
    )
    expect(client.productId).toBe('media_intel')
  })
})

describe('isProductId', () => {
  it('validates known product ids', () => {
    expect(isProductId('talent_os')).toBe(true)
    expect(isProductId('unknown')).toBe(false)
  })
})
