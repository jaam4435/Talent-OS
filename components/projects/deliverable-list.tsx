'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ProjectDeliverable, ProjectDeliverableStatus } from '@/modules/project/types'
import { useProjectDelivery } from '@/modules/project/hooks/use-project-delivery'
import { Badge } from '@/modules/core/components/ui/badge'
import { Button } from '@/modules/core/components/ui/button'
import { Input } from '@/modules/core/components/ui/input'
import { cn } from '@/modules/core/utils'

const STATUS_LABELS: Record<ProjectDeliverableStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
}

const STATUS_STYLES: Record<ProjectDeliverableStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
}

export function DeliverableList({
  projectId,
  readOnly = false,
}: {
  projectId: string
  readOnly?: boolean
}) {
  const { api, error, isPending, run } = useProjectDelivery()
  const [deliverables, setDeliverables] = useState<ProjectDeliverable[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')

  const loadDeliverables = useCallback(async () => {
    setLoading(true)
    try {
      setDeliverables(await api.listDeliverables(projectId))
    } finally {
      setLoading(false)
    }
  }, [api, projectId])

  useEffect(() => {
    void loadDeliverables()
  }, [loadDeliverables])

  function handleCreate() {
    const title = newTitle.trim()
    if (!title) return
    run(async () => {
      const row = await api.createDeliverable(projectId, { title })
      setDeliverables((current) => [row, ...current])
      setNewTitle('')
    })
  }

  function handleStatusChange(deliverableId: string, status: ProjectDeliverableStatus) {
    run(async () => {
      const updated = await api.updateDeliverable(projectId, deliverableId, { status })
      setDeliverables((current) =>
        current.map((row) => (row.id === deliverableId ? updated : row))
      )
    })
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading deliverables…</p>
  }

  return (
    <div className="space-y-4">
      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="New deliverable title"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            className="max-w-sm"
          />
          <Button size="sm" disabled={isPending || !newTitle.trim()} onClick={handleCreate}>
            Add deliverable
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!deliverables.length ? (
        <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          No deliverables yet.
        </p>
      ) : (
        <div className="rounded-lg border">
          <ul className="divide-y">
            {deliverables.map((row) => (
              <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{row.title}</p>
                  {row.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{row.description}</p>
                  ) : null}
                  {row.filePath ? (
                    <p className="mt-1 text-xs text-muted-foreground">{row.filePath}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Updated {new Date(row.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline" className={cn(STATUS_STYLES[row.status])}>
                    {STATUS_LABELS[row.status]}
                  </Badge>
                  {!readOnly ? (
                    <select
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                      value={row.status}
                      disabled={isPending}
                      onChange={(event) =>
                        handleStatusChange(row.id, event.target.value as ProjectDeliverableStatus)
                      }
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
