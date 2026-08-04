import { describe, expect, it, vi } from 'vitest'
import { AssignmentModuleService } from '@/lib/services/assignment-module.service'

describe('AssignmentModuleService', () => {
  it('blocks create when conflicts have errors', async () => {
    const repos = {
      assignmentAllocation: {
        detectConflicts: vi.fn(async () => [
          {
            conflict_type: 'double_booking',
            severity: 'error',
            conflicting_allocation_id: 'other-1',
            overlapping_pct: 100,
            message: 'Overlaps with existing assignment',
          },
        ]),
      },
    }
    const service = new AssignmentModuleService(repos as never, { create: vi.fn() } as never)

    const result = await service.createAllocation('tenant-1', 'user-1', {
      freelancer_id: 'talent-1',
      title: 'Design sprint',
      starts_at: '2026-08-01T09:00:00.000Z',
      ends_at: '2026-08-05T17:00:00.000Z',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.conflicts?.[0].conflictType).toBe('double_booking')
    }
  })

  it('creates allocation with audit when no blocking conflicts', async () => {
    const allocation = {
      id: 'alloc-1',
      freelancerId: 'talent-1',
      projectId: null,
      opportunityId: null,
      title: 'Design sprint',
      status: 'planned' as const,
      allocationPct: 50,
      startsAt: '2026-08-01T09:00:00.000Z',
      endsAt: '2026-08-05T17:00:00.000Z',
      notes: null,
      createdBy: 'user-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    const repos = {
      assignmentAllocation: {
        detectConflicts: vi.fn(async () => []),
        create: vi.fn(async () => allocation),
      },
      assignmentConflict: { record: vi.fn(async () => ({ id: 'conf-1' })) },
      assignmentHistory: { record: vi.fn(async () => ({ id: 'hist-1' })) },
      assignmentAudit: { record: vi.fn(async () => undefined) },
      domainEvent: { emit: vi.fn(async () => undefined) },
      talent: { findUserIdByFreelancerId: vi.fn(async () => null) },
    }

    const service = new AssignmentModuleService(repos as never, { create: vi.fn() } as never)
    const result = await service.createAllocation('tenant-1', 'user-1', {
      freelancer_id: 'talent-1',
      title: 'Design sprint',
      starts_at: '2026-08-01T09:00:00.000Z',
      ends_at: '2026-08-05T17:00:00.000Z',
      allocation_pct: 50,
    })

    expect(result.ok).toBe(true)
    expect(repos.assignmentAudit.record).toHaveBeenCalled()
  })

  it('returns assignment suggestions', async () => {
    const repos = {
      assignmentAllocation: {
        suggestCandidates: vi.fn(async () => [
          {
            freelancer_id: 'talent-1',
            full_name: 'Jane Doe',
            discipline: 'design',
            day_rate: 500,
            internal_rating: 4.5,
            skill_match_count: 2,
            current_allocation_pct: 20,
            availability: 'available',
          },
        ]),
      },
      assignmentAudit: { record: vi.fn(async () => undefined) },
      domainEvent: { emit: vi.fn(async () => undefined) },
    }

    const service = new AssignmentModuleService(repos as never, { create: vi.fn() } as never)
    const suggestions = await service.suggestCandidates('tenant-1', 'user-1', ['figma', 'ui'])
    expect(suggestions[0].skillMatchCount).toBe(2)
  })
})
