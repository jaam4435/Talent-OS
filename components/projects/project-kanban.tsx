'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { updateProjectStatus } from '@/app/actions/projects'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PROJECT_KANBAN_COLUMNS } from '@/lib/projects/types'
import type { ProjectStatus } from '@/types/enums'

interface KanbanProject {
  id: string
  title: string
  status: ProjectStatus
  clientName: string | null
  freelancerName: string | null
}

export function ProjectKanban({ projects }: { projects: KanbanProject[] }) {
  const [isPending, startTransition] = useTransition()

  function moveProject(projectId: string, status: ProjectStatus) {
    startTransition(async () => {
      await updateProjectStatus(projectId, status)
    })
  }

  return (
    <div className="grid gap-4 overflow-x-auto xl:grid-cols-5">
      {PROJECT_KANBAN_COLUMNS.map((column) => {
        const columnProjects = projects.filter((p) => p.status === column.status)
        return (
          <div key={column.status} className="min-w-[240px] rounded-lg border bg-muted/20">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">{column.label}</h3>
              <Badge variant="secondary">{columnProjects.length}</Badge>
            </div>
            <div className="space-y-3 p-3">
              {columnProjects.map((project) => (
                <div key={project.id} className="rounded-lg border bg-background p-3 shadow-sm">
                  <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
                    {project.title}
                  </Link>
                  {project.freelancerName ? (
                    <p className="mt-1 text-xs text-muted-foreground">{project.freelancerName}</p>
                  ) : null}
                  {project.clientName ? (
                    <p className="text-xs text-muted-foreground">{project.clientName}</p>
                  ) : null}
                  <select
                    className="mt-3 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                    value={project.status}
                    disabled={isPending}
                    onChange={(e) => moveProject(project.id, e.target.value as ProjectStatus)}
                  >
                    {PROJECT_KANBAN_COLUMNS.map((option) => (
                      <option key={option.status} value={option.status}>
                        Move to {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              {!columnProjects.length ? (
                <p className="px-1 py-6 text-center text-xs text-muted-foreground">No projects</p>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
