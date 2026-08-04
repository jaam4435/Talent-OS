import type { AnalyticsDashboardPayload } from '@/modules/analytics/types'
import { AnalyticsChartsGrid } from '@/modules/analytics/components/analytics-charts-grid'
import { SummaryKpiGrid } from '@/modules/analytics/components/summary-kpi-grid'

interface DashboardViewProps {
  payload: AnalyticsDashboardPayload
}

export function DashboardView({ payload }: DashboardViewProps) {
  return (
    <div className="space-y-6">
      <SummaryKpiGrid summary={payload.summary} />
      <AnalyticsChartsGrid charts={payload.charts} />
    </div>
  )
}
