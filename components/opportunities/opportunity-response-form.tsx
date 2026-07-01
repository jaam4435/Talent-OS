'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import { respondToOpportunity } from '@/app/actions/opportunities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface OpportunityResponseFormProps {
  opportunityId: string
  currentResponse?: string
}

export function OpportunityResponseForm({
  opportunityId,
  currentResponse,
}: OpportunityResponseFormProps) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (currentResponse && currentResponse !== 'pending') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your response</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="capitalize text-sm">
            You responded: <strong>{currentResponse}</strong>
          </p>
        </CardContent>
      </Card>
    )
  }

  function handleRespond(response: 'interested' | 'declined') {
    setError(null)
    startTransition(async () => {
      const result = await respondToOpportunity({
        opportunityId,
        response,
        note: note || undefined,
      })

      if (!result.ok) {
        setError(result.error)
        return
      }

      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Respond to opportunity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="response-note">Note (optional)</Label>
          <Input
            id="response-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Availability, questions, etc."
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex gap-3">
          <Button disabled={isPending} onClick={() => handleRespond('interested')}>
            Interested
          </Button>
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => handleRespond('declined')}
          >
            Decline
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
