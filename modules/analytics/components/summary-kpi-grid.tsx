'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { formatSummaryLabel, formatSummaryValue } from '@/modules/analytics/charts'

interface SummaryKpiGridProps {
  summary: Record<string, number | string | null>
}

export function SummaryKpiGrid({ summary }: SummaryKpiGridProps) {
  const entries = Object.entries(summary)

  if (!entries.length) {
    return <p className="text-sm text-muted-foreground">No summary metrics available.</p>
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {entries.map(([key, value]) => (
        <Card key={key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {formatSummaryLabel(key)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatSummaryValue(value)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
