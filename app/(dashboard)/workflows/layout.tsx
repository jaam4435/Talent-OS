import { notFound } from 'next/navigation'
import { BreadcrumbNav } from '@/modules/core/components/navigation/breadcrumb-nav'
import { PageHeader } from '@/modules/core/components/shared/page-header'
import { WorkflowSubNav } from '@/modules/workflow-engine/components/workflow-sub-nav'
import { requireManager } from '@/modules/core/services/guards'

export default async function WorkflowsLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireManager()
  } catch {
    notFound()
  }

  return (
    <div>
      <BreadcrumbNav
        items={[{ label: 'Operations', href: '/workflows' }, { label: 'Workflows' }]}
      />
      <PageHeader
        title="Workflows"
        description="Monitor runs, approvals, compensations, and workflow definitions."
      />
      <WorkflowSubNav />
      {children}
    </div>
  )
}
