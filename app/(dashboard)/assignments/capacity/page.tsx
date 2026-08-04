import { getAssignmentCapacityOverview } from '@/lib/queries/assignment.queries'
import { CapacityGrid } from '@/modules/assignment/components/capacity-grid'
import { requireManager } from '@/modules/core/services/guards'

export const metadata = { title: 'Assignments · Capacity' }

export default async function AssignmentCapacityPage() {
  const { tenant } = await requireManager()
  const rows = await getAssignmentCapacityOverview(tenant.id)

  return <CapacityGrid rows={rows} />
}
