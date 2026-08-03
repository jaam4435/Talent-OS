'use client'

import { MANAGER_STATUS_TRANSITIONS } from '@/lib/projects/types'
import { useProjectDelivery } from '@/modules/project/hooks/use-project-delivery'
import { Button } from '@/modules/core/components/ui/button'
import type { ProjectStatus } from '@/modules/core/types/enums'

export function ProjectStatusControls({
  projectId,
  status,
}: {
  projectId: string
  status: ProjectStatus
}) {
  const { api, error, isPending, run } = useProjectDelivery()
  const transitions = MANAGER_STATUS_TRANSITIONS[status] ?? []

  if (!transitions.length) return null

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {transitions.map((next) => (
          <Button
            key={next}
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() =>
              run(async () => {
                await api.transitionStatus(projectId, next, 'manager')
              })
            }
          >
            Mark {next.replace('_', ' ')}
          </Button>
        ))}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
