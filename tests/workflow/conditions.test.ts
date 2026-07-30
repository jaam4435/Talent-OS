import { describe, expect, it } from 'vitest'
import { evaluateCondition, evaluateConditions } from '@/lib/workflows/conditions'
import type { WorkflowTriggerContext } from '@/lib/workflows/types'

const baseContext: WorkflowTriggerContext = {
  tenantId: 'tenant-1',
  eventId: 'evt-1',
  eventType: 'opportunity.broadcast',
  aggregateType: 'opportunity',
  aggregateId: 'opp-1',
  actorId: 'user-1',
  correlationId: 'corr-1',
  idempotencyKey: 'idem-1',
  payload: {
    budget: 5000,
    status: 'open',
    tags: ['urgent', 'design'],
    nested: { score: 85 },
  },
}

describe('evaluateCondition', () => {
  it('eq matches payload field', () => {
    expect(
      evaluateCondition({ field: 'payload.status', operator: 'eq', value: 'open' }, baseContext)
    ).toBe(true)
  })

  it('neq rejects matching value', () => {
    expect(
      evaluateCondition({ field: 'payload.status', operator: 'neq', value: 'draft' }, baseContext)
    ).toBe(true)
  })

  it('gt compares numbers', () => {
    expect(
      evaluateCondition({ field: 'payload.budget', operator: 'gt', value: 1000 }, baseContext)
    ).toBe(true)
  })

  it('gte compares numbers', () => {
    expect(
      evaluateCondition({ field: 'payload.budget', operator: 'gte', value: 5000 }, baseContext)
    ).toBe(true)
  })

  it('lt compares numbers', () => {
    expect(
      evaluateCondition({ field: 'payload.budget', operator: 'lt', value: 10000 }, baseContext)
    ).toBe(true)
  })

  it('lte compares numbers', () => {
    expect(
      evaluateCondition({ field: 'payload.budget', operator: 'lte', value: 5000 }, baseContext)
    ).toBe(true)
  })

  it('exists detects present fields', () => {
    expect(evaluateCondition({ field: 'payload.budget', operator: 'exists' }, baseContext)).toBe(true)
  })

  it('exists false for missing fields', () => {
    expect(evaluateCondition({ field: 'payload.missing', operator: 'exists' }, baseContext)).toBe(false)
  })

  it('in checks array membership', () => {
    expect(
      evaluateCondition(
        { field: 'payload.status', operator: 'in', value: ['open', 'draft'] },
        baseContext
      )
    ).toBe(true)
  })

  it('resolves nested fields', () => {
    expect(
      evaluateCondition({ field: 'payload.nested.score', operator: 'gte', value: 80 }, baseContext)
    ).toBe(true)
  })

  it('reads top-level context fields', () => {
    expect(
      evaluateCondition({ field: 'eventType', operator: 'eq', value: 'opportunity.broadcast' }, baseContext)
    ).toBe(true)
  })
})

describe('evaluateConditions', () => {
  it('returns true for empty conditions', () => {
    expect(evaluateConditions(undefined, baseContext)).toBe(true)
    expect(evaluateConditions([], baseContext)).toBe(true)
  })

  it('requires all conditions to pass', () => {
    expect(
      evaluateConditions(
        [
          { field: 'payload.status', operator: 'eq', value: 'open' },
          { field: 'payload.budget', operator: 'gt', value: 1000 },
        ],
        baseContext
      )
    ).toBe(true)
  })

  it('fails when any condition fails', () => {
    expect(
      evaluateConditions(
        [
          { field: 'payload.status', operator: 'eq', value: 'open' },
          { field: 'payload.budget', operator: 'lt', value: 1000 },
        ],
        baseContext
      )
    ).toBe(false)
  })
})
