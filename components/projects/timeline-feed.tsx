'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ProjectTimelineEvent } from '@/modules/project/types'
import { useProjectDelivery } from '@/modules/project/hooks/use-project-delivery'
import { Badge } from '@/modules/core/components/ui/badge'
import { formatDateTime } from '@/modules/core/utils/format'

export function TimelineFeed({ projectId }: { projectId: string }) {
  const { api } = useProjectDelivery()
  const [events, setEvents] = useState<ProjectTimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTimeline = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setEvents(await api.getTimeline(projectId))
    } catch {
      setError('Could not load timeline.')
    } finally {
      setLoading(false)
    }
  }, [api, projectId])

  useEffect(() => {
    void loadTimeline()
  }, [loadTimeline])

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading timeline…</p>
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  if (!events.length) {
    return (
      <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
        No timeline events yet.
      </p>
    )
  }

  return (
    <div className="rounded-lg border">
      <ul className="divide-y">
        {events.map((event) => (
          <li key={event.id} className="space-y-1 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{event.title}</p>
              <Badge variant="secondary" className="capitalize">
                {event.eventType.replaceAll('_', ' ')}
              </Badge>
            </div>
            {event.description ? (
              <p className="text-sm text-muted-foreground">{event.description}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">{formatDateTime(event.occurredAt)}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
