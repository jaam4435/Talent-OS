'use client'

import Link from 'next/link'
import type { AssignmentConflict } from '@/modules/assignment/types'
import { useAssignments } from '@/modules/assignment/hooks/use-assignments'
import { Badge } from '@/modules/core/components/ui/badge'
import { Button } from '@/modules/core/components/ui/button'
import { DataTable, type DataTableColumn } from '@/modules/core/components/shared/data-table'
import { formatDateTime } from '@/modules/core/utils/format'

interface ConflictListProps {
  conflicts: AssignmentConflict[]
}

export function ConflictList({ conflicts }: ConflictListProps) {
  const { api, error, isPending, run } = useAssignments()

  const columns: DataTableColumn<AssignmentConflict>[] = [
    {
      id: 'type',
      header: 'Type',
      cell: (row) => (
        <Badge variant={row.severity === 'error' ? 'destructive' : 'secondary'} className="capitalize">
          {row.conflictType.replaceAll('_', ' ')}
        </Badge>
      ),
    },
    {
      id: 'allocations',
      header: 'Allocations',
      cell: (row) => (
        <div className="space-y-1 text-sm">
          <Link href={`/assignments/${row.allocationIdA}`} className="font-medium hover:underline">
            Primary allocation
          </Link>
          {row.allocationIdB ? (
            <p>
              <Link href={`/assignments/${row.allocationIdB}`} className="hover:underline">
                Conflicting allocation
              </Link>
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: 'created',
      header: 'Detected',
      cell: (row) => formatDateTime(row.createdAt),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row) => (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => run(() => api.resolveConflict(row.id))}
        >
          Resolve
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!conflicts.length ? (
        <p className="text-sm text-muted-foreground">No open assignment conflicts.</p>
      ) : (
        <DataTable columns={columns} data={conflicts} getRowKey={(row) => row.id} />
      )}
    </div>
  )
}
