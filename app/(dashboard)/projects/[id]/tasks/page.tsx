import { TaskBoard } from '@/components/projects/task-board'
import { requireTenant } from '@/modules/core/services/session'
import { isManager } from '@/modules/core/services/permissions'

export const metadata = { title: 'Project tasks' }

export default async function ProjectTasksPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { tenant } = await requireTenant()
  const manager = isManager(tenant.role)

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Tasks</h2>
      <TaskBoard projectId={id} readOnly={!manager} />
    </div>
  )
}
