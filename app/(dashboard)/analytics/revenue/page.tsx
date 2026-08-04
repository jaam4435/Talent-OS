import { getAnalyticsRevenue } from '@/lib/queries/analytics.queries'
import { DashboardShell } from '@/modules/analytics/components/dashboard-shell'
import { DashboardView } from '@/modules/analytics/components/dashboard-view'
import { parseAnalyticsSearchParams } from '@/modules/analytics/server/search-params'
import { requireManager } from '@/modules/core/services/guards'

export const metadata = { title: 'Analytics · Revenue' }

export default async function AnalyticsRevenuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { tenant } = await requireManager()
  const params = parseAnalyticsSearchParams(await searchParams)
  const payload = await getAnalyticsRevenue(tenant.id, params)

  return (
    <DashboardShell
      title="Revenue"
      description="Payment volume, pending balances, and aging buckets."
      dashboard="revenue"
      cachedAt={payload.cachedAt}
      cacheTtlMs={payload.cacheTtlMs}
      period={params.period}
      from={params.from}
      to={params.to}
    >
      <DashboardView payload={payload} />
    </DashboardShell>
  )
}
