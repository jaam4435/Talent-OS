import Link from 'next/link'
import type { AnalyticsModuleSummary } from '@/modules/analytics/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { ANALYTICS_DASHBOARD_LINKS } from '@/modules/analytics/dashboard-links'
import { formatSummaryLabel, formatSummaryValue } from '@/modules/analytics/charts'

interface ModuleSummaryViewProps {
  summary: AnalyticsModuleSummary
}

export function ModuleSummaryView({ summary }: ModuleSummaryViewProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {ANALYTICS_DASHBOARD_LINKS.filter((link) => link.id !== 'summary').map((link) => {
        const metrics = summary[link.id] as Record<string, unknown>
        const topMetrics = Object.entries(metrics ?? {}).slice(0, 4)

        return (
          <Card key={link.id}>
            <CardHeader>
              <CardTitle className="text-lg">{link.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topMetrics.length ? (
                topMetrics.map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{formatSummaryLabel(key)}</span>
                    <span className="font-medium">
                      {formatSummaryValue(value as number | string | null)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No metrics yet.</p>
              )}
              <Link href={link.href} className="text-sm font-medium hover:underline">
                Open dashboard
              </Link>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
