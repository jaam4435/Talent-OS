'use client'

import Link from 'next/link'
import type { AssignmentCapacityOverviewRow } from '@/lib/queries/assignment.queries'
import {
  allocationPctForWeek,
  getUpcomingWeeks,
} from '@/modules/assignment/utils/capacity-weeks'
import { Badge } from '@/modules/core/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/modules/core/components/shared/data-table'

interface CapacityGridProps {
  rows: AssignmentCapacityOverviewRow[]
}

export function CapacityGrid({ rows }: CapacityGridProps) {
  const weeks = getUpcomingWeeks(4)

  const summaryColumns: DataTableColumn<AssignmentCapacityOverviewRow>[] = [
    {
      id: 'freelancer',
      header: 'Freelancer',
      cell: (row) => (
        <>
          <p className="font-medium">{row.fullName}</p>
          <p className="text-sm capitalize text-muted-foreground">{row.discipline}</p>
        </>
      ),
    },
    {
      id: 'weekly_hours',
      header: 'Weekly hours',
      cell: (row) => row.weeklyHours ?? '—',
    },
    {
      id: 'max_concurrent',
      header: 'Max concurrent',
      cell: (row) => row.maxConcurrentAssignments ?? '—',
    },
    {
      id: 'active',
      header: 'Active allocations',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span>{row.activeAllocationCount}</span>
          <Badge variant={row.totalAllocationPct > 100 ? 'destructive' : 'secondary'}>
            {row.totalAllocationPct}%
          </Badge>
        </div>
      ),
    },
    ...weeks.map((week) => ({
      id: week.label,
      header: week.label,
      cell: (row: AssignmentCapacityOverviewRow) => {
        const pct = row.allocations.reduce(
          (sum, allocation) => sum + allocationPctForWeek(allocation, week),
          0
        )
        return pct ? `${pct}%` : '—'
      },
    })),
  ]

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Weekly columns show allocation percentage overlapping each week window.{' '}
        <Link href="/assignments" className="underline">
          View allocations
        </Link>
      </p>
      {!rows.length ? (
        <p className="text-sm text-muted-foreground">No talent roster entries found.</p>
      ) : (
        <DataTable columns={summaryColumns} data={rows} getRowKey={(row) => row.freelancerId} />
      )}
    </div>
  )
}
