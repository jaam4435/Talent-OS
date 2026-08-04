import { describe, expect, it, vi } from 'vitest'
import { AnalyticsModuleService } from '@/lib/services/analytics-module.service'
import { ANALYTICS_DASHBOARDS, ANALYTICS_CACHE_TTL } from '@/modules/analytics/types'
import { dashboardToCsv, normalizeCharts } from '@/modules/analytics/charts'
import { resolveDateRange } from '@/modules/analytics/validation'
import { hasPermission } from '@/modules/core/services/permissions'

describe('AnalyticsModuleService', () => {
  it('lists all dashboard domains', () => {
    expect(ANALYTICS_DASHBOARDS).toContain('organizations')
    expect(ANALYTICS_DASHBOARDS).toContain('workflows')
    expect(ANALYTICS_DASHBOARDS).toContain('ai_usage')
  })

  it('fetches organizations dashboard with cache metadata', async () => {
    const repos = {
      analyticsModule: {
        invalidateTenantCache: vi.fn(async () => undefined),
        getOrganizations: vi.fn(async () => ({
          summary: { total_members: 5 },
          charts: { members_by_role: [{ label: 'admin', y: 1 }] },
          cachedAt: new Date().toISOString(),
          cacheTtlMs: ANALYTICS_CACHE_TTL.organizations,
        })),
      },
    }
    const analytics = { getDashboardSummary: vi.fn() }
    const service = new AnalyticsModuleService(repos as never, analytics as never)

    const result = await service.getOrganizations('tenant-1')
    expect(result.summary.total_members).toBe(5)
    expect(repos.analyticsModule.getOrganizations).toHaveBeenCalledWith(
      'tenant-1',
      ANALYTICS_CACHE_TTL.organizations
    )
  })

  it('creates CSV export from dashboard data', async () => {
    const repos = {
      analyticsModule: {
        getProjects: vi.fn(async () => ({
          summary: { total: 10, active: 4 },
          charts: { by_status: [{ label: 'active', y: 4 }] },
        })),
      },
      analyticsExport: {
        create: vi.fn(async (input: { content: string; row_count: number }) => ({
          id: 'exp-1',
          tenantId: 'tenant-1',
          requestedBy: 'user-1',
          dashboard: 'projects',
          format: 'csv',
          status: 'completed',
          rowCount: input.row_count,
          content: input.content,
          filters: {},
          errorMessage: null,
          createdAt: new Date().toISOString(),
          expiresAt: new Date().toISOString(),
        })),
      },
    }
    const service = new AnalyticsModuleService(repos as never, {} as never)

    const record = await service.createExport('tenant-1', 'user-1', {
      dashboard: 'projects',
      format: 'csv',
    })

    expect(record.id).toBe('exp-1')
    expect(record.content).toContain('metric,value')
    expect(repos.analyticsExport.create).toHaveBeenCalled()
  })

  it('invalidates cache on refresh', async () => {
    const repos = {
      analyticsModule: {
        invalidateTenantCache: vi.fn(async () => undefined),
        getModuleSummary: vi.fn(async () => ({
          organizations: {},
          projects: {},
          talent: {},
          utilization: {},
          revenue: {},
          delivery: {},
          ai_usage: {},
          workflows: {},
          legacy: null,
        })),
      },
    }
    const service = new AnalyticsModuleService(repos as never, {} as never)
    await service.getSummary('tenant-1', true)
    expect(repos.analyticsModule.invalidateTenantCache).toHaveBeenCalledWith('tenant-1')
  })
})

describe('Analytics charts and validation', () => {
  it('normalizes RPC chart payloads', () => {
    const charts = normalizeCharts({
      by_status: [{ label: 'active', value: 3 }],
      over_time: [{ x: '2026-01', y: 5 }],
    })
    expect(charts.by_status[0].y).toBe(3)
    expect(charts.over_time[0].x).toBe('2026-01')
  })

  it('converts dashboard to CSV', () => {
    const csv = dashboardToCsv({
      summary: { total: 10 },
      charts: { by_status: [{ label: 'active', y: 4 }] },
    })
    expect(csv).toContain('total,10')
    expect(csv).toContain('by_status,active,,4')
  })

  it('resolves 30d date range by default', () => {
    const range = resolveDateRange({})
    expect(range.from).toBeDefined()
    expect(range.to).toBeDefined()
  })

  it('grants analytics:export to managers only', () => {
    expect(hasPermission('admin', 'analytics:export')).toBe(true)
    expect(hasPermission('talent_manager', 'analytics:export')).toBe(true)
    expect(hasPermission('freelancer', 'analytics:export')).toBe(false)
  })
})
