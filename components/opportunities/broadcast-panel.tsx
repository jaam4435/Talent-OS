'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { broadcastOpportunity } from '@/app/actions/opportunities'
import { Button } from '@/modules/core/components/ui/button'
import { Badge } from '@/modules/core/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { Label } from '@/modules/core/components/ui/label'

interface FreelancerOption {
  id: string
  full_name: string
  email: string
  discipline: string
  availability: string
}

interface BroadcastPanelProps {
  opportunityId: string
  freelancers: FreelancerOption[]
  existingRecipientIds: string[]
  canBroadcast: boolean
}

export function BroadcastPanel({
  opportunityId,
  freelancers,
  existingRecipientIds,
  canBroadcast,
}: BroadcastPanelProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const existingSet = new Set(existingRecipientIds)
  const available = freelancers.filter((f) => !existingSet.has(f.id))

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleBroadcast() {
    setError(null)
    const ids = [...selected]
    if (!ids.length) {
      setError('Select at least one freelancer')
      return
    }

    startTransition(async () => {
      const result = await broadcastOpportunity({ opportunityId, freelancerIds: ids })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSelected(new Set())
      router.refresh()
    })
  }

  if (!canBroadcast) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Broadcast opportunity</CardTitle>
        <CardDescription>
          Send this opportunity to selected freelancers via in-app notification and WhatsApp.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!available.length ? (
          <p className="text-sm text-muted-foreground">
            All roster freelancers have already been invited.
          </p>
        ) : (
          <ul className="max-h-64 divide-y overflow-y-auto rounded-lg border">
            {available.map((freelancer) => (
              <li key={freelancer.id} className="flex items-center gap-3 p-3">
                <input
                  type="checkbox"
                  id={`broadcast-${freelancer.id}`}
                  checked={selected.has(freelancer.id)}
                  onChange={() => toggle(freelancer.id)}
                  className="h-4 w-4 rounded border"
                />
                <Label htmlFor={`broadcast-${freelancer.id}`} className="flex-1 cursor-pointer">
                  <span className="font-medium">{freelancer.full_name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">{freelancer.email}</span>
                  <div className="mt-1 flex gap-2">
                    <Badge variant="outline" className="capitalize text-xs">
                      {freelancer.discipline}
                    </Badge>
                    <Badge variant="secondary" className="capitalize text-xs">
                      {freelancer.availability}
                    </Badge>
                  </div>
                </Label>
              </li>
            ))}
          </ul>
        )}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button onClick={handleBroadcast} disabled={isPending || !available.length}>
          {isPending ? 'Broadcasting...' : `Broadcast to ${selected.size || 0} freelancer(s)`}
        </Button>
      </CardContent>
    </Card>
  )
}
