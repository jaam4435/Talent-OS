import { BreadcrumbNav } from '@/modules/core/components/navigation/breadcrumb-nav'
import { PageHeader } from '@/modules/core/components/shared/page-header'
import { ObservabilityDashboardPanel } from '@/modules/core/components/observability/observability-dashboard'
import { requireAdmin } from '@/modules/core/services/guards'

export const metadata = { title: 'Observability' }

export default async function ObservabilitySettingsPage() {
  await requireAdmin()

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: 'Admin', href: '/settings' },
          { label: 'Settings', href: '/settings' },
          { label: 'Observability' },
        ]}
      />
      <PageHeader
        title="Observability"
        description="Platform health, logs, alerts, and distributed trace lookup."
      />
      <ObservabilityDashboardPanel />
    </div>
  )
}
