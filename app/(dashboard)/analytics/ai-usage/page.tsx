import { getAnalyticsAiUsage } from '@/lib/queries/analytics.queries'
import { DashboardShell } from '@/modules/analytics/components/dashboard-shell'
import { DashboardView } from '@/modules/analytics/components/dashboard-view'
import { parseAnalyticsSearchParams } from '@/modules/analytics/server/search-params'
import { requireManager } from '@/modules/core/services/guards'

export const metadata = { title: 'Analytics · AI usage' }

export default async function AnalyticsAiUsagePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { tenant } = await requireManager()
  const params = parseAnalyticsSearchParams(await searchParams)
  const payload = await getAnalyticsAiUsage(tenant.id, params)

  return (
    <DashboardShell
      title="AI usage"
      description="Token consumption, request volume, and estimated provider cost."
      dashboard="ai_usage"
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
