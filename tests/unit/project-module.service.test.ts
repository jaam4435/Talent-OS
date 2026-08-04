import { describe, expect, it, vi } from 'vitest'
import { ProjectModuleService, mapProjectSummary } from '@/lib/services/project-module.service'
import type { Tables } from '@/modules/core/types/database'

function baseProject(overrides: Partial<Tables<'projects'>> = {}): Tables<'projects'> {
  return {
    id: 'proj-1',
    tenant_id: 'tenant-1',
    opportunity_id: null,
    shortlist_id: null,
    freelancer_id: 'talent-1',
    assigned_by: 'user-1',
    title: 'Website redesign',
    description: 'Client site refresh',
    client_name: 'Acme',
    company_id: null,
    budget: 10000,
    currency: 'USD',
    status: 'active',
    requirements: {},
    ai_summary: null,
    ai_status_assessment: null,
    deleted_at: null,
    priority: 'high',
    deadline: '2026-12-31',
    template_id: null,
    health_score: 85,
    health_status: 'on_track',
    ai_context: {},
    started_at: '2026-01-01T00:00:00.000Z',
    completed_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('mapProjectSummary', () => {
  it('maps database row to module summary', () => {
    const summary = mapProjectSummary(baseProject())
    expect(summary.title).toBe('Website redesign')
    expect(summary.healthScore).toBe(85)
    expect(summary.priority).toBe('high')
  })
})

describe('ProjectModuleService', () => {
  it('rejects invalid status transitions', async () => {
    const repos = {
      project: {
        findModuleById: vi.fn(async () => baseProject({ status: 'draft' })),
      },
    }
    const notifications = { create: vi.fn(async () => undefined) }
    const service = new ProjectModuleService(repos as never, notifications as never)

    const result = await service.transitionStatus('tenant-1', 'user-1', 'proj-1', 'completed', 'manager')
    expect(result.ok).toBe(false)
  })

  it('returns health metrics from RPC', async () => {
    const repos = {
      project: {
        findModuleById: vi.fn(async () => baseProject()),
        computeHealth: vi.fn(async () => ({
          health_score: 70,
          health_status: 'at_risk',
          overdue_milestones: 1,
          overdue_tasks: 2,
          blocked_tasks: 0,
          open_deliverables: 3,
        })),
      },
    }
    const service = new ProjectModuleService(repos as never, { create: vi.fn() } as never)
    const health = await service.getHealth('tenant-1', 'proj-1')
    expect(health?.healthScore).toBe(70)
    expect(health?.overdueTasks).toBe(2)
  })

  it('creates task with audit event', async () => {
    const repos = {
      project: {
        findModuleById: vi.fn(async () => baseProject()),
        refreshHealth: vi.fn(async () => undefined),
      },
      projectTask: {
        create: vi.fn(async () => ({
          id: 'task-1',
          projectId: 'proj-1',
          milestoneId: null,
          title: 'Design mockups',
          description: null,
          status: 'todo',
          priority: 'medium',
          assigneeId: null,
          dueDate: null,
          sortOrder: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        })),
      },
      projectAudit: { record: vi.fn(async () => undefined) },
      domainEvent: { emit: vi.fn(async () => undefined) },
    }
    const service = new ProjectModuleService(repos as never, { create: vi.fn() } as never)
    const result = await service.createTask('tenant-1', 'user-1', 'proj-1', { title: 'Design mockups' })
    expect(result.ok).toBe(true)
    expect(repos.projectAudit.record).toHaveBeenCalled()
  })
})
