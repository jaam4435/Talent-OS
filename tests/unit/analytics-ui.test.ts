import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getNavGroupsForRole } from '@/modules/core/components/navigation/nav-config'
import {
  formatSummaryLabel,
  inferChartType,
  toRechartsSeries,
} from '@/modules/analytics/charts'

const ROOT = process.cwd()

function read(path: string) {
  return readFileSync(join(ROOT, path), 'utf8')
}

describe('Analytics UI routes', () => {
  const pages = [
    'app/(dashboard)/analytics/layout.tsx',
    'app/(dashboard)/analytics/page.tsx',
    'app/(dashboard)/analytics/summary/page.tsx',
    'app/(dashboard)/analytics/organizations/page.tsx',
    'app/(dashboard)/analytics/projects/page.tsx',
    'app/(dashboard)/analytics/talent/page.tsx',
    'app/(dashboard)/analytics/utilization/page.tsx',
    'app/(dashboard)/analytics/revenue/page.tsx',
    'app/(dashboard)/analytics/delivery/page.tsx',
    'app/(dashboard)/analytics/ai-usage/page.tsx',
    'app/(dashboard)/analytics/workflows/page.tsx',
  ]

  it.each(pages)('%s uses requireManager or layout guard', (pagePath) => {
    const src = read(pagePath)
    if (pagePath.endsWith('layout.tsx')) {
      expect(src).toContain('requireManager')
      expect(src).toContain('notFound')
    } else if (pagePath.endsWith('analytics/page.tsx')) {
      expect(src).toContain('AnalyticsHub')
    } else {
      expect(src).toContain('requireManager')
    }
  })

  it('provides analytics loading skeleton', () => {
    expect(read('app/(dashboard)/analytics/loading.tsx')).toContain('AnalyticsLoadingSkeleton')
  })
})

describe('Analytics chart transformers', () => {
  it('maps chart points to Recharts rows', () => {
    const series = toRechartsSeries([{ label: 'active', y: 4 }])
    expect(series[0]).toEqual({ name: 'active', value: 4 })
  })

  it('infers line charts for trend series', () => {
    expect(inferChartType('projects_over_time')).toBe('line')
    expect(inferChartType('by_status')).toBe('bar')
    expect(inferChartType('provider_share')).toBe('pie')
  })

  it('formats summary labels', () => {
    expect(formatSummaryLabel('total_members')).toBe('Total Members')
  })
})

describe('Analytics API client', () => {
  it('uses REST endpoints for exports', () => {
    const src = read('lib/api/analytics-api.ts')
    expect(src).toContain('/api/analytics/exports')
    expect(src).toContain('downloadExportContent')
  })

  it('uses analytics hook with user-friendly errors', () => {
    const src = read('modules/analytics/hooks/use-analytics-dashboard.ts')
    expect(src).toContain('getUserMessageForApiError')
    expect(src).toContain('exportDashboard')
  })
})

describe('Analytics navigation', () => {
  it('keeps analytics link for managers', () => {
    const labels = getNavGroupsForRole('talent_manager')
      .flatMap((group) => group.items)
      .map((item) => item.label)
    expect(labels).toContain('Analytics')
  })
})
