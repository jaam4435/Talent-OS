import { getAnalyticsOrganizations } from '@/lib/queries/analytics.queries'
import { DashboardShell } from '@/modules/analytics/components/dashboard-shell'
import { DashboardView } from '@/modules/analytics/components/dashboard-view'
import { parseAnalyticsSearchParams } from '@/modules/analytics/server/search-params'
import { requireManager } from '@/modules/core/services/guards'

export const metadata = { title: 'Analytics · Organizations' }

export default async function AnalyticsOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { tenant } = await requireManager()
  const params = parseAnalyticsSearchParams(await searchParams)
  const payload = await getAnalyticsOrganizations(tenant.id, params.refresh)

  return (
    <DashboardShell
      title="Organizations"
      description="Workspace membership, teams, and invitation activity."
      dashboard="organizations"
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
