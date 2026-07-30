'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sparkles, RefreshCw } from 'lucide-react'
import { runAiTalentMatch } from '@/app/actions/ai'
import { broadcastOpportunity } from '@/app/actions/opportunities'
import { addToShortlist } from '@/app/actions/shortlists'
import { Button } from '@/modules/core/components/ui/button'
import { Badge } from '@/modules/core/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/modules/core/components/ui/card'

interface MatchScore {
  id: string
  score: number
  rationale: string | null
  skillOverlap: string[]
  rank: number | null
  freelancerId?: string
  freelancer?: {
    id: string
    full_name: string
    discipline: string
    day_rate: number | null
    availability: string
    internal_rating: number | null
  }
}

interface MatchStatus {
  id: string
  status: string
  createdAt: string
  completedAt: string | null
  result: Record<string, unknown> | null
}

interface AiMatchPanelProps {
  opportunityId: string
  initialScores?: MatchScore[]
  initialRequest?: MatchStatus | null
  showActions?: boolean
}

export function AiMatchPanel({
  opportunityId,
  initialScores = [],
  initialRequest = null,
  showActions = true,
}: AiMatchPanelProps) {
  const router = useRouter()
  const [scores, setScores] = useState(initialScores)
  const [latestRequest, setLatestRequest] = useState<MatchStatus | null>(initialRequest)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isProcessing =
    latestRequest?.status === 'pending' || latestRequest?.status === 'processing'

  const refreshResults = useCallback(async () => {
    const response = await fetch(`/api/ai/match/${opportunityId}`)
    if (!response.ok) return

    const json = (await response.json()) as {
      data: { scores: MatchScore[]; latestRequest: MatchStatus | null }
    }

    setScores(json.data.scores)
    setLatestRequest(json.data.latestRequest)
  }, [opportunityId])

  useEffect(() => {
    if (!isProcessing) return

    const interval = setInterval(() => {
      void refreshResults()
    }, 3000)

    return () => clearInterval(interval)
  }, [isProcessing, refreshResults])

  function toggleFreelancer(freelancerId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(freelancerId)) next.delete(freelancerId)
      else next.add(freelancerId)
      return next
    })
  }

  function handleRunMatch() {
    setError(null)
    setActionMessage(null)
    startTransition(async () => {
      const result = await runAiTalentMatch(opportunityId)
      if (!result.ok) {
        setError(result.error)
        return
      }

      setLatestRequest({
        id: result.aiRequestId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        completedAt: null,
        result: null,
      })

      setTimeout(() => void refreshResults(), 1500)
    })
  }

  function handleAddToShortlist() {
    const ids = [...selected]
    if (!ids.length) {
      setError('Select at least one match')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await addToShortlist(opportunityId, ids)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setActionMessage(`Added ${ids.length} candidate(s) to shortlist`)
      setSelected(new Set())
      router.refresh()
    })
  }

  function handleBroadcastSelected() {
    const ids = [...selected]
    if (!ids.length) {
      setError('Select at least one match')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await broadcastOpportunity({ opportunityId, freelancerIds: ids })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setActionMessage(`Broadcast to ${result.recipientCount} freelancer(s)`)
      setSelected(new Set())
      router.refresh()
    })
  }

  const usedFallback = latestRequest?.result?.used_fallback === true

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI talent matches
          </CardTitle>
          <CardDescription>
            Rank freelancers by skill fit, discipline, availability, and rating.
          </CardDescription>
        </div>
        <Button onClick={handleRunMatch} disabled={isPending || isProcessing} size="sm">
          {isPending || isProcessing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Matching…
            </>
          ) : (
            'Run AI match'
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-sm text-destructive">{formatError(error)}</p> : null}
        {actionMessage ? <p className="text-sm text-muted-foreground">{actionMessage}</p> : null}

        {latestRequest ? (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary" className="capitalize">
              {latestRequest.status}
            </Badge>
            {usedFallback ? <Badge variant="outline">Rule-based fallback</Badge> : null}
          </div>
        ) : null}

        {!scores.length ? (
          <p className="text-sm text-muted-foreground">
            No AI suggestions yet. Run a match to rank available talent for this opportunity.
          </p>
        ) : (
          <>
            {showActions ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending || !selected.size}
                  onClick={handleAddToShortlist}
                >
                  Add to shortlist ({selected.size})
                </Button>
                <Button
                  size="sm"
                  disabled={isPending || !selected.size}
                  onClick={handleBroadcastSelected}
                >
                  Broadcast selected ({selected.size})
                </Button>
              </div>
            ) : null}

            <ul className="divide-y rounded-lg border">
              {scores.map((score, index) => {
                const freelancerId = score.freelancer?.id ?? score.freelancerId
                const canSelect = showActions && !!freelancerId

                return (
                  <li key={score.id} className="flex items-start justify-between gap-4 p-4">
                    <div className="flex min-w-0 flex-1 gap-3">
                      {canSelect ? (
                        <input
                          type="checkbox"
                          checked={freelancerId ? selected.has(freelancerId) : false}
                          onChange={() => freelancerId && toggleFreelancer(freelancerId)}
                          className="mt-1 h-4 w-4 rounded border"
                          aria-label={`Select ${score.freelancer?.full_name ?? 'freelancer'}`}
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            #{index + 1}
                          </span>
                          {score.freelancer ? (
                            <Link
                              href={`/talent/${score.freelancer.id}`}
                              className="font-medium hover:underline"
                            >
                              {score.freelancer.full_name}
                            </Link>
                          ) : (
                            <span className="font-medium">Freelancer</span>
                          )}
                          <Badge variant="outline" className="capitalize">
                            {score.freelancer?.discipline}
                          </Badge>
                        </div>
                        {score.rationale ? (
                          <p className="mt-1 text-sm text-muted-foreground">{score.rationale}</p>
                        ) : null}
                        {score.skillOverlap.length ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {score.skillOverlap.map((skill) => (
                              <Badge key={skill} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold tabular-nums">{score.score.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">match</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function formatError(code: string) {
  switch (code) {
    case 'AI_MATCHING_DISABLED':
      return 'AI matching is disabled for your agency. Enable it in settings.'
    case 'AI_MONTHLY_LIMIT_EXCEEDED':
      return 'Monthly AI request limit reached. Upgrade your plan or wait until next month.'
    case 'OPPORTUNITY_NOT_FOUND':
      return 'Opportunity not found.'
    default:
      return code.length < 80 ? code : 'Could not complete action. Please try again.'
  }
}
