import { listAssignmentConflicts } from '@/lib/queries/assignment.queries'
import { ConflictList } from '@/modules/assignment/components/conflict-list'
import { requireManager } from '@/modules/core/services/guards'

export const metadata = { title: 'Assignments · Conflicts' }

export default async function AssignmentConflictsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { tenant } = await requireManager()
  const params = await searchParams
  const conflicts = await listAssignmentConflicts(
    tenant.id,
    typeof params.freelancer_id === 'string' ? params.freelancer_id : undefined
  )

  return <ConflictList conflicts={conflicts} />
}
