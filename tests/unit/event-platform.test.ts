import { describe, expect, it } from 'vitest'
import {
  EVENT_CATALOG,
  DOMAIN_EVENTS,
  APPLICATION_EVENTS,
  INTEGRATION_EVENTS,
  findCatalogEntry,
  isKnownEventType,
} from '@/lib/events/catalog'
import { IdempotencyKeys } from '@/lib/events/idempotency'
import { FinanceEvents } from '@/modules/finance/events'
import { AiEvents } from '@/modules/ai/events'
import { WhatsappEvents } from '@/modules/whatsapp/events'

describe('Event platform catalog', () => {
  it('documents all three event categories', () => {
    expect(DOMAIN_EVENTS.length).toBeGreaterThan(0)
    expect(APPLICATION_EVENTS.length).toBeGreaterThan(0)
    expect(INTEGRATION_EVENTS.length).toBeGreaterThan(0)
    expect(EVENT_CATALOG.length).toBe(
      DOMAIN_EVENTS.length + APPLICATION_EVENTS.length + INTEGRATION_EVENTS.length
    )
  })

  it('includes production finance and AI events', () => {
    expect(findCatalogEntry(FinanceEvents.PAYMENT_APPROVED)?.category).toBe('domain')
    expect(findCatalogEntry(AiEvents.MATCH_REQUESTED)?.category).toBe('application')
    expect(findCatalogEntry(WhatsappEvents.INBOUND)?.category).toBe('application')
  })

  it('resolves dynamic payment trigger events', () => {
    expect(isKnownEventType('payment.pending')).toBe(true)
    expect(findCatalogEntry('payment.pending')?.domain).toBe('finance')
  })

  it('builds stable idempotency keys', () => {
    expect(IdempotencyKeys.paymentApproved('pay-1')).toBe('payment-approved:pay-1')
    expect(IdempotencyKeys.aiMatch('opp-1', 'req-1')).toBe('ai-match:opp-1:req-1')
  })
})

describe('Event platform workers', () => {
  it('exports dispatch and job workers', async () => {
    const mod = await import('@/lib/events/workers/dispatch-worker')
    expect(mod.runEventDispatchWorker).toBeTypeOf('function')
    expect(mod.runEventCompletionWorker).toBeTypeOf('function')

    const jobs = await import('@/lib/events/workers/job-worker')
    expect(jobs.runJobProcessorWorker).toBeTypeOf('function')
  })
})
