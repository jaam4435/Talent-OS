import { notFound } from 'next/navigation'
import { getAssignmentAllocationDetail } from '@/lib/queries/assignment.queries'
import { AllocationDetailPanel } from '@/modules/assignment/components/allocation-detail-panel'
import { requireManager } from '@/modules/core/services/guards'

export const metadata = { title: 'Assignments · Detail' }

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { tenant } = await requireManager()
  const { id } = await params
  const detail = await getAssignmentAllocationDetail(tenant.id, id)
  if (!detail) notFound()

  return (
    <AllocationDetailPanel
      allocation={detail.allocation}
      schedules={detail.schedules}
      requirements={detail.requirements}
      history={detail.history}
    />
  )
}
