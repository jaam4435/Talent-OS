import Link from 'next/link'
import { Badge } from '@/modules/core/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { formatDateTime } from '@/modules/core/utils/format'

interface TalentMatchInsight {
  id: string
  opportunity_id: string
  score: number
  rationale: string | null
  skill_overlap: string[] | null
  rank: number | null
  created_at: string
  opportunities?: { title: string; status: string } | null
}

interface TalentMatchInsightsProps {
  matches: TalentMatchInsight[]
}

export function TalentMatchInsights({ matches }: TalentMatchInsightsProps) {
  if (!matches.length) return null

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>AI match insights</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y rounded-lg border">
          {matches.map((match) => (
            <li key={match.id} className="flex items-start justify-between gap-4 p-4">
              <div>
                <Link
                  href={`/opportunities/${match.opportunity_id}`}
                  className="font-medium hover:underline"
                >
                  {match.opportunities?.title ?? 'Opportunity'}
                </Link>
                {match.opportunities?.status ? (
                  <Badge variant="outline" className="ml-2 capitalize">
                    {match.opportunities.status}
                  </Badge>
                ) : null}
                {match.rationale ? (
                  <p className="mt-2 text-sm text-muted-foreground">{match.rationale}</p>
                ) : null}
                {match.skill_overlap?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {match.skill_overlap.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold tabular-nums">{Number(match.score).toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(match.created_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
