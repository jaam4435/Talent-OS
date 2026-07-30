'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/modules/core/components/ui/button'
import { Badge } from '@/modules/core/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/modules/core/components/ui/card'

interface AiJobStatus {
  id: string
  status: string
  createdAt: string
  completedAt: string | null
  result: Record<string, unknown> | null
}

interface AiSummaryCardProps {
  title: string
  description: string
  actionLabel: string
  onRun: () => Promise<{ ok: boolean; error?: string; aiRequestId?: string }>
  pollUrl: string
  initialSummary?: Record<string, unknown> | null
  initialRequest?: AiJobStatus | null
  renderSummary: (summary: Record<string, unknown>) => React.ReactNode
}

export function AiSummaryCard({
  title,
  description,
  actionLabel,
  onRun,
  pollUrl,
  initialSummary,
  initialRequest,
  renderSummary,
}: AiSummaryCardProps) {
  const router = useRouter()
  const [summary, setSummary] = useState(initialSummary)
  const [latestRequest, setLatestRequest] = useState<AiJobStatus | null>(initialRequest ?? null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isProcessing =
    latestRequest?.status === 'pending' || latestRequest?.status === 'processing'

  const refresh = useCallback(async () => {
    const response = await fetch(pollUrl)
    if (!response.ok) return

    const json = (await response.json()) as {
      data: {
        summary?: Record<string, unknown> | null
        latestRequest?: AiJobStatus | null
      }
    }

    if (json.data.summary) setSummary(json.data.summary)
    if (json.data.latestRequest) setLatestRequest(json.data.latestRequest)
  }, [pollUrl])

  useEffect(() => {
    if (!isProcessing) return
    const interval = setInterval(() => void refresh(), 3000)
    return () => clearInterval(interval)
  }, [isProcessing, refresh])

  function handleRun() {
    setError(null)
    startTransition(async () => {
      const result = await onRun()
      if (!result.ok) {
        setError(result.error ?? 'Request failed')
        return
      }

      if (result.aiRequestId) {
        setLatestRequest({
          id: result.aiRequestId,
          status: 'pending',
          createdAt: new Date().toISOString(),
          completedAt: null,
          result: null,
        })
      }

      setTimeout(() => {
        void refresh()
        router.refresh()
      }, 1500)
    })
  }

  const displaySummary =
    summary ??
    (latestRequest?.status === 'completed' ? latestRequest.result ?? null : null)

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button size="sm" variant="outline" disabled={isPending || isProcessing} onClick={handleRun}>
          {isPending || isProcessing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Working…
            </>
          ) : (
            actionLabel
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {latestRequest ? (
          <Badge variant="secondary" className="capitalize">
            {latestRequest.status}
          </Badge>
        ) : null}
        {displaySummary ? renderSummary(displaySummary) : (
          <p className="text-sm text-muted-foreground">No summary generated yet.</p>
        )}
      </CardContent>
    </Card>
  )
}
