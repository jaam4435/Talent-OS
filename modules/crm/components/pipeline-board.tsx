'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { CrmDeal, CrmPipelineBoard } from '@/modules/crm/types'
import { useCrm } from '@/modules/crm/hooks/use-crm'
import { Badge } from '@/modules/core/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { formatCurrency } from '@/modules/core/utils/format'
import { cn } from '@/modules/core/utils'

interface PipelineBoardProps {
  board: CrmPipelineBoard
}

export function PipelineBoard({ board }: PipelineBoardProps) {
  const { api, error, isPending, run } = useCrm()
  const [draggingDealId, setDraggingDealId] = useState<string | null>(null)

  function handleDrop(stageId: string, dealId: string) {
    if (isPending) return
    run(async () => {
      await api.moveDealStage(dealId, stageId)
    })
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>{board.totals.count} deals</span>
        <span>{formatCurrency(board.totals.value)} pipeline value</span>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {board.stages.map((stage) => (
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
                      stages={board.stages}
                      disabled={isPending}
                      onDragStart={() => setDraggingDealId(deal.id)}
                      onDragEnd={() => setDraggingDealId(null)}
                      onStageChange={(stageId) => handleDrop(stageId, deal.id)}
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
