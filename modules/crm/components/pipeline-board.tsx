'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import type { CrmDeal, CrmPipelineBoard } from '@/modules/crm/types'
import { crmApi } from '@/lib/api/crm-api'
import { getUserMessageForApiError } from '@/lib/api/user-messages'
import { Badge } from '@/modules/core/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { formatCurrency } from '@/modules/core/utils/format'
import { cn } from '@/modules/core/utils'

interface PipelineBoardProps {
  board: CrmPipelineBoard
}

function moveDealInBoard(board: CrmPipelineBoard, dealId: string, stageId: string): CrmPipelineBoard {
  let movingDeal: CrmDeal | null = null

  const stages = board.stages.map((stage) => {
    const deal = stage.deals.find((row) => row.id === dealId)
    if (!deal) return stage
    movingDeal = deal
    return { ...stage, deals: stage.deals.filter((row) => row.id !== dealId) }
  })

  if (!movingDeal) return board

  const deal = movingDeal as CrmDeal
  const targetStage = stages.find((stage) => stage.id === stageId)
  if (!targetStage) return board

  return {
    ...board,
    stages: stages.map((stage) =>
      stage.id === stageId
        ? {
            ...stage,
            deals: [{ ...deal, stageId }, ...stage.deals],
          }
        : stage
    ),
  }
}

export function PipelineBoard({ board }: PipelineBoardProps) {
  const [localBoard, setLocalBoard] = useState(board)
  const [draggingDealId, setDraggingDealId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setLocalBoard(board)
  }, [board])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timer)
  }, [toast])

  function handleDrop(stageId: string, dealId: string) {
    if (isPending) return

    const previous = localBoard
    const currentStageId = previous.stages.find((stage) =>
      stage.deals.some((deal) => deal.id === dealId)
    )?.id

    if (!currentStageId || currentStageId === stageId) return

    setLocalBoard(moveDealInBoard(previous, dealId, stageId))

    startTransition(async () => {
      try {
        await crmApi.moveDealStage(dealId, stageId)
      } catch (error) {
        setLocalBoard(previous)
        setToast(getUserMessageForApiError(error))
      }
    })
  }

  return (
    <div className="space-y-4">
      {toast ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {toast}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>{localBoard.totals.count} deals</span>
        <span>{formatCurrency(localBoard.totals.value)} pipeline value</span>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {localBoard.stages.map((stage) => (
          <div
            key={stage.id}
            className="min-w-[280px] flex-1"
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
            }}
            onDrop={(event) => {
              event.preventDefault()
              const dealId = event.dataTransfer.getData('text/deal-id') || draggingDealId
              if (dealId) handleDrop(stage.id, dealId)
              setDraggingDealId(null)
            }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{stage.name}</CardTitle>
                  <Badge variant="outline">{stage.deals.length}</Badge>
                </div>
                {stage.color ? (
                  <div className="h-1 rounded-full" style={{ backgroundColor: stage.color }} />
                ) : null}
              </CardHeader>
              <CardContent className="space-y-3">
                {stage.deals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No deals in this stage.</p>
                ) : (
                  stage.deals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      stages={localBoard.stages}
                      disabled={isPending}
                      onDragStart={() => setDraggingDealId(deal.id)}
                      onDragEnd={() => setDraggingDealId(null)}
                      onStageChange={(nextStageId) => handleDrop(nextStageId, deal.id)}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}

interface DealCardProps {
  deal: CrmDeal
  stages: CrmPipelineBoard['stages']
  disabled: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onStageChange: (stageId: string) => void
}

function DealCard({
  deal,
  stages,
  disabled,
  onDragStart,
  onDragEnd,
  onStageChange,
}: DealCardProps) {
  return (
    <div
      draggable={!disabled}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/deal-id', deal.id)
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'rounded-md border bg-background p-3 shadow-sm transition-opacity',
        disabled && 'opacity-60'
      )}
    >
      <Link href={`/crm/deals/${deal.id}`} className="font-medium hover:underline">
        {deal.title}
      </Link>
      <p className="mt-1 text-sm text-muted-foreground">
        {deal.value != null ? formatCurrency(deal.value, deal.currency) : 'No value set'}
      </p>
      <select
        className="mt-2 h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
        value={deal.stageId}
        disabled={disabled}
        onChange={(event) => onStageChange(event.target.value)}
        onClick={(event) => event.stopPropagation()}
      >
        {stages.map((stage) => (
          <option key={stage.id} value={stage.id}>
            {stage.name}
          </option>
        ))}
      </select>
    </div>
  )
}
