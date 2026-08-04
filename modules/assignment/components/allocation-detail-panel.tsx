'use client'

import Link from 'next/link'
import { useState } from 'react'
import type {
  AssignmentAllocation,
  AssignmentHistoryEntry,
  AssignmentRequirement,
  AssignmentSchedule,
} from '@/modules/assignment/types'
import { useAssignments } from '@/modules/assignment/hooks/use-assignments'
import { Badge } from '@/modules/core/components/ui/badge'
import { Button } from '@/modules/core/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { DataTable, type DataTableColumn } from '@/modules/core/components/shared/data-table'
import { formatDate, formatDateTime } from '@/modules/core/utils/format'
import { cn } from '@/modules/core/utils'

interface AllocationDetailPanelProps {
  allocation: AssignmentAllocation
  schedules: AssignmentSchedule[]
  requirements: AssignmentRequirement[]
  history: AssignmentHistoryEntry[]
}

const TABS = ['Overview', 'Schedules', 'Requirements', 'History'] as const

export function AllocationDetailPanel({
  allocation,
  schedules,
  requirements,
  history,
}: AllocationDetailPanelProps) {
  const { api, error, isPending, run } = useAssignments()
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview')

  const scheduleColumns: DataTableColumn<AssignmentSchedule>[] = [
    {
      id: 'window',
      header: 'Window',
      cell: (row) => `${formatDateTime(row.startsAt)} – ${formatDateTime(row.endsAt)}`,
    },
    { id: 'hours', header: 'Hours', cell: (row) => row.hours },
    { id: 'notes', header: 'Notes', cell: (row) => row.notes ?? '—' },
  ]

  const requirementColumns: DataTableColumn<AssignmentRequirement>[] = [
    {
      id: 'skills',
      header: 'Skills',
      cell: (row) => row.requiredSkills.join(', ') || '—',
    },
    { id: 'min_hours', header: 'Min hours', cell: (row) => row.minHours ?? '—' },
    { id: 'description', header: 'Description', cell: (row) => row.description ?? '—' },
  ]

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>{allocation.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {formatDate(allocation.startsAt)} – {formatDate(allocation.endsAt)}
              </p>
            </div>
            <Badge className="capitalize">{allocation.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium">Allocation</p>
            <p className="text-sm text-muted-foreground">{allocation.allocationPct}%</p>
          </div>
          <div>
            <p className="text-sm font-medium">Freelancer</p>
            <Link href={`/talent/${allocation.freelancerId}`} className="text-sm hover:underline">
              View talent profile
            </Link>
          </div>
          {allocation.projectId ? (
            <div>
              <p className="text-sm font-medium">Project</p>
              <Link href={`/projects/${allocation.projectId}`} className="text-sm hover:underline">
                View project
              </Link>
            </div>
          ) : null}
          {allocation.opportunityId ? (
            <div>
              <p className="text-sm font-medium">Opportunity</p>
              <Link href={`/opportunities/${allocation.opportunityId}`} className="text-sm hover:underline">
                View opportunity
              </Link>
            </div>
          ) : null}
          {allocation.notes ? (
            <div className="md:col-span-2">
              <p className="text-sm font-medium">Notes</p>
              <p className="text-sm text-muted-foreground">{allocation.notes}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium',
              tab === item
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'Overview' ? (
        <div className="flex flex-wrap gap-2">
          {allocation.status !== 'canceled' ? (
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => run(() => api.cancelAllocation(allocation.id))}
            >
              Cancel allocation
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/assignments/conflicts">View conflicts</Link>
          </Button>
        </div>
      ) : null}

      {tab === 'Schedules' ? (
        schedules.length ? (
          <DataTable columns={scheduleColumns} data={schedules} getRowKey={(row) => row.id} />
        ) : (
          <p className="text-sm text-muted-foreground">No schedules recorded for this allocation.</p>
        )
      ) : null}

      {tab === 'Requirements' ? (
        requirements.length ? (
          <DataTable columns={requirementColumns} data={requirements} getRowKey={(row) => row.id} />
        ) : (
          <p className="text-sm text-muted-foreground">No requirements recorded for this allocation.</p>
        )
      ) : null}

      {tab === 'History' ? (
        history.length ? (
          <ul className="space-y-3">
            {history.map((entry) => (
              <li key={entry.id} className="rounded-md border p-4 text-sm">
                <p className="font-medium">{entry.action}</p>
                <p className="text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No history entries yet.</p>
        )
      ) : null}
    </div>
  )
}
