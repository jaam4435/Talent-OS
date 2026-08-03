'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ProjectTask, ProjectTaskStatus } from '@/modules/project/types'
import { useProjectDelivery } from '@/modules/project/hooks/use-project-delivery'
import { Badge } from '@/modules/core/components/ui/badge'
import { Button } from '@/modules/core/components/ui/button'
import { Input } from '@/modules/core/components/ui/input'

const COLUMNS: Array<{ status: ProjectTaskStatus; label: string }> = [
  { status: 'todo', label: 'To do' },
  { status: 'in_progress', label: 'In progress' },
  { status: 'blocked', label: 'Blocked' },
  { status: 'done', label: 'Done' },
]

export function TaskBoard({
  projectId,
  readOnly = false,
}: {
  projectId: string
  readOnly?: boolean
}) {
  const { api, error, isPending, run } = useProjectDelivery()
  const [tasks, setTasks] = useState<ProjectTask[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')

  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await api.listTasks(projectId)
      setTasks(rows.filter((task) => task.status !== 'canceled'))
    } finally {
      setLoading(false)
    }
  }, [api, projectId])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  function handleCreate() {
    const title = newTitle.trim()
    if (!title) return
    run(async () => {
      const task = await api.createTask(projectId, { title })
      setTasks((current) => [...current, task])
      setNewTitle('')
    })
  }

  function handleStatusChange(taskId: string, status: ProjectTaskStatus) {
    run(async () => {
      const updated = await api.updateTask(projectId, taskId, { status })
      setTasks((current) => current.map((task) => (task.id === taskId ? updated : task)))
    })
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading tasks…</p>
  }

  return (
    <div className="space-y-4">
      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="New task title"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            className="max-w-sm"
          />
          <Button size="sm" disabled={isPending || !newTitle.trim()} onClick={handleCreate}>
            Add task
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 overflow-x-auto md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column.status)
          return (
            <div key={column.status} className="min-w-[220px] rounded-lg border bg-muted/20">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h3 className="text-sm font-semibold">{column.label}</h3>
                <Badge variant="secondary">{columnTasks.length}</Badge>
              </div>
              <div className="space-y-3 p-3">
                {columnTasks.map((task) => (
                  <div key={task.id} className="rounded-lg border bg-background p-3 shadow-sm">
                    <p className="font-medium">{task.title}</p>
                    {task.description ? (
                      <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
                    ) : null}
                    {task.dueDate ? (
                      <p className="mt-1 text-xs text-muted-foreground">Due {task.dueDate}</p>
                    ) : null}
                    {!readOnly ? (
                      <select
                        className="mt-3 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                        value={task.status}
                        disabled={isPending}
                        onChange={(event) =>
                          handleStatusChange(task.id, event.target.value as ProjectTaskStatus)
                        }
                      >
                        {COLUMNS.map((option) => (
                          <option key={option.status} value={option.status}>
                            {option.label}
                          </option>
                        ))}
                        <option value="canceled">Canceled</option>
                      </select>
                    ) : (
                      <Badge variant="outline" className="mt-2 capitalize">
                        {task.status.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                ))}
                {!columnTasks.length ? (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">No tasks</p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
