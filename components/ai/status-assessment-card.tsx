'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { runStatusAssessment } from '@/app/actions/ai-pm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface StatusAssessmentCardProps {
  projectId: string
  currentStatus: string
  initialAssessment?: Record<string, unknown> | null
  initialRequest?: {
    id: string
    status: string
    result: Record<string, unknown> | null
  } | null
}

export function StatusAssessmentCard({
  projectId,
  currentStatus,
  initialAssessment,
  initialRequest,
}: StatusAssessmentCardProps) {
  const router = useRouter()
  const [assessment, setAssessment] = useState(initialAssessment)
  const [latestRequest, setLatestRequest] = useState(initialRequest ?? null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isProcessing =
    latestRequest?.status === 'pending' || latestRequest?.status === 'processing'

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/ai/pm/project/${projectId}`)
    if (!response.ok) return

    const json = (await response.json()) as {
      data: {
        assessment?: Record<string, unknown> | null
        latestRequest?: typeof latestRequest
      }
    }

    if (json.data.assessment) setAssessment(json.data.assessment)
    if (json.data.latestRequest) setLatestRequest(json.data.latestRequest)
  }, [projectId])

  useEffect(() => {
    if (!isProcessing) return
    const interval = setInterval(() => void refresh(), 3000)
    return () => clearInterval(interval)
  }, [isProcessing, refresh])

  function handleRun() {
    setError(null)
    startTransition(async () => {
      const result = await runStatusAssessment(projectId)
      if (!result.ok) {
        setError(result.error)
        return
      }

      setLatestRequest({
        id: result.aiRequestId,
        status: 'pending',
        result: null,
      })

      setTimeout(() => {
        void refresh()
        router.refresh()
      }, 1500)
    })
  }

  const display =
    assessment ??
    (latestRequest?.status === 'completed' ? latestRequest.result ?? null : null)

  const riskLevel = String(display?.risk_level ?? display?.riskLevel ?? 'on_track')
  const suggestedStatus = display?.suggested_status ?? display?.suggestedStatus

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" />
            AI status assessment
          </CardTitle>
          <CardDescription>
            Automatic risk check based on milestones, due dates, and recent activity.
          </CardDescription>
        </div>
        <Button size="sm" disabled={isPending || isProcessing} onClick={handleRun}>
          {isPending || isProcessing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Assessing…
            </>
          ) : (
            'Run assessment'
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {error ? <p className="text-destructive">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Badge className="capitalize">Current: {currentStatus}</Badge>
          <Badge variant={riskBadgeVariant(riskLevel)} className="capitalize">
            {riskLevel.replace('_', ' ')}
          </Badge>
          {suggestedStatus ? (
            <Badge variant="outline">Suggested: {String(suggestedStatus)}</Badge>
          ) : null}
        </div>

        {display?.narrative ? <p>{String(display.narrative)}</p> : null}

        {Array.isArray(display?.reasons) && display.reasons.length ? (
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            {display.reasons.map((reason: string) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : !display ? (
          <p className="text-muted-foreground">No assessment yet.</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function riskBadgeVariant(risk: string) {
  if (risk === 'blocked') return 'destructive' as const
  if (risk === 'at_risk') return 'secondary' as const
  return 'outline' as const
}
