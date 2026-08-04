import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getNavGroupsForRole } from '@/modules/core/components/navigation/nav-config'
import {
  conflictCheckSchema,
  validateAllocationTarget,
} from '@/modules/assignment/validation'
import { allocationPctForWeek, getUpcomingWeeks } from '@/modules/assignment/utils/capacity-weeks'
import type { AssignmentAllocation } from '@/modules/assignment/types'

const ROOT = process.cwd()

function read(path: string) {
  return readFileSync(join(ROOT, path), 'utf8')
}

describe('Assignment UI routes', () => {
  const pages = [
    'app/(dashboard)/assignments/layout.tsx',
    'app/(dashboard)/assignments/page.tsx',
    'app/(dashboard)/assignments/new/page.tsx',
    'app/(dashboard)/assignments/[id]/page.tsx',
    'app/(dashboard)/assignments/capacity/page.tsx',
    'app/(dashboard)/assignments/conflicts/page.tsx',
  ]

  it.each(pages)('%s uses requireManager or layout guard', (pagePath) => {
    const src = read(pagePath)
    if (pagePath.endsWith('layout.tsx')) {
      expect(src).toContain('requireManager')
      expect(src).toContain('notFound')
    } else {
      expect(src).toContain('requireManager')
    }
  })

  it('adds read-only assignment summary to project detail', () => {
    expect(read('app/(dashboard)/projects/[id]/page.tsx')).toContain('ProjectAssignmentSummary')
  })
})

describe('Assignment navigation', () => {
  it('includes assignments link for managers', () => {
    const labels = getNavGroupsForRole('talent_manager')
      .flatMap((group) => group.items)
      .map((item) => item.label)
    expect(labels).toContain('Assignments')
  })

  it('hides assignments from freelancers', () => {
    const labels = getNavGroupsForRole('freelancer')
      .flatMap((group) => group.items)
      .map((item) => item.label)
    expect(labels).not.toContain('Assignments')
  })
})

describe('Assignment API client', () => {
  it('uses REST endpoints for mutations', () => {
    const src = read('lib/api/assignment-api.ts')
    expect(src).toContain('/api/assignments/conflicts/check')
    expect(src).toContain('/api/assignments/suggest')
    expect(src).toContain('/api/assignments/conflicts/')
  })

  it('uses assignment hook with user-friendly errors', () => {
    const src = read('modules/assignment/hooks/use-assignments.ts')
    expect(src).toContain('getUserMessageForApiError')
    expect(src).toContain('router.refresh()')
  })
})

describe('Assignment conflict validation', () => {
  it('requires exactly one allocation target', () => {
    expect(validateAllocationTarget('550e8400-e29b-41d4-a716-446655440000', null).ok).toBe(true)
    expect(validateAllocationTarget(null, '550e8400-e29b-41d4-a716-446655440001').ok).toBe(true)
    expect(validateAllocationTarget(null, null).ok).toBe(false)
    expect(
      validateAllocationTarget(
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440001'
      ).ok
    ).toBe(false)
  })

  it('accepts valid conflict check payload', () => {
    const result = conflictCheckSchema.safeParse({
      freelancer_id: '550e8400-e29b-41d4-a716-446655440000',
      starts_at: '2026-08-01T09:00:00.000Z',
      ends_at: '2026-08-31T17:00:00.000Z',
      allocation_pct: 50,
    })
    expect(result.success).toBe(true)
  })
})

describe('Assignment capacity helpers', () => {
  it('computes weekly allocation overlap', () => {
    const weeks = getUpcomingWeeks(1, new Date('2026-08-04T12:00:00.000Z'))
    const allocation: AssignmentAllocation = {
      id: 'a1',
      freelancerId: 'f1',
      projectId: 'p1',
      opportunityId: null,
      title: 'Test',
      status: 'planned',
      allocationPct: 50,
      startsAt: '2026-08-01T00:00:00.000Z',
      endsAt: '2026-08-31T23:59:59.999Z',
      notes: null,
      createdBy: null,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    }

    expect(allocationPctForWeek(allocation, weeks[0])).toBe(50)
  })
})
