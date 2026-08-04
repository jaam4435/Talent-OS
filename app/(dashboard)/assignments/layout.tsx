import { notFound } from 'next/navigation'
import { BreadcrumbNav } from '@/modules/core/components/navigation/breadcrumb-nav'
import { PageHeader } from '@/modules/core/components/shared/page-header'
import { AssignmentSubNav } from '@/modules/assignment/components/assignment-sub-nav'
import { requireManager } from '@/modules/core/services/guards'

export default async function AssignmentsLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireManager()
  } catch {
    notFound()
  }

  return (
    <div>
      <BreadcrumbNav
        items={[{ label: 'Supply', href: '/talent' }, { label: 'Assignments' }]}
      />
      <PageHeader
        title="Assignments"
        description="Plan allocations, monitor capacity, and resolve scheduling conflicts."
      />
      <AssignmentSubNav />
      {children}
    </div>
  )
}
