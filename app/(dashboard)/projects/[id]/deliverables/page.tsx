import { DeliverableList } from '@/components/projects/deliverable-list'
import { requireTenant } from '@/modules/core/services/session'
import { isManager } from '@/modules/core/services/permissions'

export const metadata = { title: 'Project deliverables' }

export default async function ProjectDeliverablesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { tenant } = await requireTenant()
  const manager = isManager(tenant.role)

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Deliverables</h2>
      <DeliverableList projectId={id} readOnly={!manager} />
    </div>
  )
}
