'use client'

import { AiSummaryCard } from '@/components/ai/ai-summary-card'
import { runShortlistSummary } from '@/app/actions/ai-pm'

interface ShortlistSummarySectionProps {
  opportunityId: string
  initialSummary?: Record<string, unknown> | null
  initialRequest?: {
    id: string
    status: string
    createdAt: string
    completedAt: string | null
    result: Record<string, unknown> | null
  } | null
}

export function ShortlistSummarySection({
  opportunityId,
  initialSummary,
  initialRequest,
}: ShortlistSummarySectionProps) {
  return (
    <AiSummaryCard
      title="AI shortlist summary"
      description="Narrative comparison of shortlisted and matched candidates."
      actionLabel="Generate comparison"
      pollUrl={`/api/ai/pm/opportunity/${opportunityId}`}
      initialSummary={initialSummary}
      initialRequest={initialRequest}
      onRun={async () => runShortlistSummary(opportunityId)}
      renderSummary={(summary) => (
        <div className="space-y-3 text-sm">
          <p>{String(summary.summary_text ?? '')}</p>
          {Array.isArray(summary.comparison_points) && summary.comparison_points.length ? (
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {summary.comparison_points.map((point: string) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    />
  )
}
