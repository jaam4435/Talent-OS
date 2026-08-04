import Link from 'next/link'
import type { AssignmentAllocation } from '@/modules/assignment/types'
import { Badge } from '@/modules/core/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { DataTable, type DataTableColumn } from '@/modules/core/components/shared/data-table'
import { formatDate } from '@/modules/core/utils/format'

interface ProjectAssignmentSummaryProps {
  projectId: string
  projectFreelancerId?: string | null
  allocations: AssignmentAllocation[]
}

export function ProjectAssignmentSummary({
  projectId,
  projectFreelancerId,
  allocations,
}: ProjectAssignmentSummaryProps) {
  const columns: DataTableColumn<AssignmentAllocation>[] = [
    {
      id: 'title',
      header: 'Allocation',
      cell: (row) => (
        <Link href={`/assignments/${row.id}`} className="font-medium hover:underline">
          {row.title}
        </Link>
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
      id: 'pct',
      header: 'Load',
      cell: (row) => `${row.allocationPct}%`,
    },
    {
      id: 'dates',
      header: 'Dates',
      cell: (row) => `${formatDate(row.startsAt)} – ${formatDate(row.endsAt)}`,
    },
  ]

  const mismatched = allocations.some(
    (allocation) => projectFreelancerId && allocation.freelancerId !== projectFreelancerId
  )

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Assignment planning</CardTitle>
            <p className="text-sm text-muted-foreground">
              Read-only allocations linked to this project.
            </p>
          </div>
          <Link href={`/assignments/new?project_id=${projectId}`} className="text-sm font-medium hover:underline">
            Create allocation
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {mismatched ? (
          <Badge variant="outline" className="text-amber-700">
            Project assignee differs from one or more allocation records
          </Badge>
        ) : null}
        {allocations.length ? (
          <DataTable columns={columns} data={allocations} getRowKey={(row) => row.id} />
        ) : (
          <p className="text-sm text-muted-foreground">
            No assignment allocations linked to this project yet.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
