import { notFound } from 'next/navigation'
import { BreadcrumbNav } from '@/modules/core/components/navigation/breadcrumb-nav'
import { PageHeader } from '@/modules/core/components/shared/page-header'
import { AnalyticsSubNav } from '@/modules/analytics/components/analytics-sub-nav'
import { requireManager } from '@/modules/core/services/guards'

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireManager()
  } catch {
    notFound()
  }

  return (
    <div>
      <BreadcrumbNav
        items={[{ label: 'Insights', href: '/analytics' }, { label: 'Analytics' }]}
      />
      <PageHeader
        title="Analytics"
        description="Operational dashboards for revenue, delivery, talent, and workflows."
      />
      <AnalyticsSubNav />
      {children}
    </div>
  )
}
