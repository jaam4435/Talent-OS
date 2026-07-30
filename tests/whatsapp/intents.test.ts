import { describe, expect, it } from 'vitest'
import { detectIntent, availabilityForIntent } from '@/lib/whatsapp/intents'
import type { ConversationContext } from '@/lib/whatsapp/types'

function baseContext(overrides: Partial<ConversationContext> = {}): ConversationContext {
  return {
    tenantId: 't1',
    freelancerId: 'f1',
    phone: '+1234',
    activeIntent: null,
    activeEntityType: null,
    activeEntityId: null,
    context: {},
    lastMessageAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('detectIntent', () => {
  it('detects YES as opportunity.interested', () => {
    const result = detectIntent('yes', null)
    expect(result.intent).toBe('opportunity.interested')
  })

  it('detects SUBMIT as milestone.submit', () => {
    const result = detectIntent('submit', null)
    expect(result.intent).toBe('milestone.submit')
  })

  it('detects OPPORTUNITIES list intent', () => {
    const result = detectIntent('opportunities', null)
    expect(result.intent).toBe('opportunity.list')
  })

  it('detects APPROVE when approval is pinned', () => {
    const ctx = baseContext({
      activeIntent: 'approval.resolve',
      activeEntityType: 'approval_request',
      activeEntityId: 'appr-1',
    })
    const result = detectIntent('approve', ctx)
    expect(result.intent).toBe('approval.approve')
  })

  it('detects REJECT when approval is pinned', () => {
    const ctx = baseContext({
      activeIntent: 'approval.resolve',
      activeEntityType: 'approval_request',
      activeEntityId: 'appr-1',
    })
    const result = detectIntent('reject', ctx)
    expect(result.intent).toBe('approval.reject')
  })

  it('falls back to agent.query for long free text', () => {
    const result = detectIntent('What milestones are due this week?', null)
    expect(result.intent).toBe('agent.query')
  })

  it('uses active context when no keyword match', () => {
    const ctx = baseContext({
      activeIntent: 'milestone.submit',
      activeEntityType: 'milestone',
      activeEntityId: 'm1',
    })
    const result = detectIntent('ready now', ctx)
    expect(result.intent).toBe('milestone.submit')
  })
})

describe('availabilityForIntent', () => {
  it('maps availability intents', () => {
    expect(availabilityForIntent('availability.available')).toBe('available')
    expect(availabilityForIntent('availability.busy')).toBe('busy')
    expect(availabilityForIntent('availability.unavailable')).toBe('unavailable')
  })
})
