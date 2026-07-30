import { describe, expect, it } from 'vitest'
import {
  WORKFLOW_REGISTRY,
  findWorkflowsForEvent,
  findWorkflowById,
} from '@/lib/workflows/registry'

describe('WORKFLOW_REGISTRY', () => {
  it('contains milestone submitted approval workflow', () => {
    const wf = findWorkflowById('wf-milestone-submitted')
    expect(wf).toBeDefined()
    expect(wf?.steps[0]?.type).toBe('approval')
  })

  it('all workflows have unique ids', () => {
    const ids = WORKFLOW_REGISTRY.map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all workflows have domain_event triggers', () => {
    for (const wf of WORKFLOW_REGISTRY) {
      expect(wf.trigger.type).toBe('domain_event')
      expect(wf.trigger.eventType).toBeTruthy()
    }
  })
})

describe('findWorkflowsForEvent', () => {
  it('returns broadcast workflow', () => {
    const workflows = findWorkflowsForEvent('opportunity.broadcast')
    expect(workflows.length).toBeGreaterThan(0)
    expect(workflows[0].id).toBe('wf-opportunity-broadcast')
  })

  it('returns empty for unknown events', () => {
    expect(findWorkflowsForEvent('unknown.event')).toEqual([])
  })

  it('returns multiple AI workflows for distinct events', () => {
    expect(findWorkflowsForEvent('ai.match_requested')).toHaveLength(1)
    expect(findWorkflowsForEvent('ai.brief_parse_requested')).toHaveLength(1)
  })

  it('milestone approved has notify step', () => {
    const [wf] = findWorkflowsForEvent('milestone.approved')
    expect(wf?.steps.some((s) => s.type === 'action' && s.action === 'notify')).toBe(true)
  })
})

describe('findWorkflowById', () => {
  it('returns undefined for unknown id', () => {
    expect(findWorkflowById('wf-does-not-exist')).toBeUndefined()
  })

  it('returns payment paid workflow', () => {
    const wf = findWorkflowById('wf-payment-paid')
    expect(wf?.trigger.eventType).toBe('payment.paid')
  })
})
