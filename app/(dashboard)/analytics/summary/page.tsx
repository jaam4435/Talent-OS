import { getAnalyticsSummary } from '@/lib/queries/analytics.queries'
import { DashboardShell } from '@/modules/analytics/components/dashboard-shell'
import { ModuleSummaryView } from '@/modules/analytics/components/module-summary-view'
import { parseAnalyticsSearchParams } from '@/modules/analytics/server/search-params'
import { requireManager } from '@/modules/core/services/guards'

export const metadata = { title: 'Analytics · Summary' }

export default async function AnalyticsSummaryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { tenant } = await requireManager()
  const params = parseAnalyticsSearchParams(await searchParams)
  const summary = await getAnalyticsSummary(tenant.id, params.refresh)

  return (
    <DashboardShell
      title="Summary"
      description="Cross-domain KPIs aggregated from all analytics modules."
      dashboard="summary"
      period={params.period}
      from={params.from}
      to={params.to}
    >
      <ModuleSummaryView summary={summary} />
    </DashboardShell>
  )
}
