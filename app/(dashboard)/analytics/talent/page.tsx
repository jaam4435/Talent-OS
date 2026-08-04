import { getAnalyticsTalent } from '@/lib/queries/analytics.queries'
import { DashboardShell } from '@/modules/analytics/components/dashboard-shell'
import { DashboardView } from '@/modules/analytics/components/dashboard-view'
import { parseAnalyticsSearchParams } from '@/modules/analytics/server/search-params'
import { requireManager } from '@/modules/core/services/guards'

export const metadata = { title: 'Analytics · Talent' }

export default async function AnalyticsTalentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { tenant } = await requireManager()
  const params = parseAnalyticsSearchParams(await searchParams)
  const payload = await getAnalyticsTalent(tenant.id, params.refresh)

  return (
    <DashboardShell
      title="Talent"
      description="Roster composition, availability, and internal ratings."
      dashboard="talent"
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
