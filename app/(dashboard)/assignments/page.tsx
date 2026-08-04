import Link from 'next/link'
import { Suspense } from 'react'
import { Plus, Users2 } from 'lucide-react'
import { listAssignmentAllocations } from '@/lib/queries/assignment.queries'
import { AssignmentListFilters } from '@/modules/assignment/components/assignment-list-filters'
import { Button } from '@/modules/core/components/ui/button'
import { Badge } from '@/modules/core/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/modules/core/components/shared/data-table'
import { EmptyState } from '@/modules/core/components/shared/empty-state'
import { Pagination } from '@/modules/core/components/shared/pagination'
import { formatDate } from '@/modules/core/utils/format'
import { requireManager } from '@/modules/core/services/guards'
import type { AssignmentAllocation } from '@/modules/assignment/types'

export const metadata = { title: 'Assignments' }

const columns: DataTableColumn<AssignmentAllocation>[] = [
  {
    id: 'title',
    header: 'Allocation',
    cell: (row) => (
      <>
        <Link href={`/assignments/${row.id}`} className="font-medium hover:underline">
          {row.title}
        </Link>
        <p className="text-sm text-muted-foreground">{row.allocationPct}% load</p>
      </>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: (row) => (
      <Badge variant="secondary" className="capitalize">
        {row.status}
      </Badge>
    ),
  },
  {
    id: 'dates',
    header: 'Dates',
    cell: (row) => `${formatDate(row.startsAt)} – ${formatDate(row.endsAt)}`,
  },
  {
    id: 'target',
    header: 'Target',
    cell: (row) =>
      row.projectId ? (
        <Link href={`/projects/${row.projectId}`} className="text-sm hover:underline">
          Project
        </Link>
      ) : row.opportunityId ? (
        <Link href={`/opportunities/${row.opportunityId}`} className="text-sm hover:underline">
          Opportunity
        </Link>
      ) : (
        '—'
      ),
  },
]

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { tenant } = await requireManager()
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))
  const limit = 20

  const allocations = await listAssignmentAllocations(tenant.id, {
    page,
    limit,
    status: typeof params.status === 'string' ? params.status : undefined,
    freelancerId: typeof params.freelancer_id === 'string' ? params.freelancer_id : undefined,
    projectId: typeof params.project_id === 'string' ? params.project_id : undefined,
    opportunityId: typeof params.opportunity_id === 'string' ? params.opportunity_id : undefined,
    from: typeof params.from === 'string' ? params.from : undefined,
    to: typeof params.to === 'string' ? params.to : undefined,
  })

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <Button asChild>
          <Link href="/assignments/new">
            <Plus className="mr-2 h-4 w-4" />
            New allocation
          </Link>
        </Button>
      </div>

      <Suspense fallback={null}>
        <AssignmentListFilters />
      </Suspense>

      {!allocations.data.length ? (
        <EmptyState
          icon={Users2}
          title="No allocations found"
          description="Create an allocation or adjust your filters."
          action={
            <Button asChild>
              <Link href="/assignments/new">New allocation</Link>
            </Button>
          }
        />
      ) : (
        <>
          <DataTable columns={columns} data={allocations.data} getRowKey={(row) => row.id} />
          <Suspense fallback={null}>
            <Pagination page={page} hasMore={allocations.hasMore} pathname="/assignments" />
          </Suspense>
        </>
      )}
    </div>
  )
}
