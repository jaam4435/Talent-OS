'use client'

import { useState, useTransition } from 'react'
import { Sparkles } from 'lucide-react'
import { parseRequirementsFromText } from '@/app/actions/ai-pm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ParsedRequirements } from '@/lib/integrations/ai/types'

interface RequirementGatheringPanelProps {
  title: string
  description: string
  budget?: string
  currency: string
  onApply: (requirements: ParsedRequirements) => void
}

export function RequirementGatheringPanel({
  title,
  description,
  budget,
  currency,
  onApply,
}: RequirementGatheringPanelProps) {
  const [requirements, setRequirements] = useState<ParsedRequirements | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleParse() {
    if (!title.trim()) {
      setError('Enter a title before parsing requirements')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await parseRequirementsFromText({
        title,
        description: description || undefined,
        budget: budget ? Number(budget) : undefined,
        currency,
      })

      if (!result.ok) {
        setError(formatError(result.error))
        return
      }

      setRequirements(result.requirements)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" />
          AI requirement gathering
        </CardTitle>
        <CardDescription>
          Parse the brief into skills, deliverables, milestones, and risks before creating.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleParse}>
          {isPending ? 'Parsing...' : 'Parse brief with AI'}
        </Button>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {requirements ? (
          <div className="space-y-4 rounded-lg border p-4 text-sm">
            <p>{requirements.summary}</p>

            {requirements.skills.length ? (
              <div>
                <p className="mb-2 font-medium">Suggested skills</p>
                <div className="flex flex-wrap gap-1">
                  {requirements.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {requirements.deliverables.length ? (
              <div>
                <p className="mb-2 font-medium">Deliverables</p>
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  {requirements.deliverables.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {requirements.suggestedMilestones.length ? (
              <div>
                <p className="mb-2 font-medium">Suggested milestones</p>
                <ul className="space-y-2">
                  {requirements.suggestedMilestones.map((milestone) => (
                    <li key={milestone.title} className="rounded border p-2">
                      <p className="font-medium">{milestone.title}</p>
                      {milestone.description ? (
                        <p className="text-muted-foreground">{milestone.description}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {requirements.risks.length ? (
              <div>
                <p className="mb-2 font-medium">Risks</p>
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  {requirements.risks.map((risk) => (
                    <li key={risk}>{risk}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Button type="button" size="sm" onClick={() => onApply(requirements)}>
              Apply to form
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function formatError(code: string) {
  switch (code) {
    case 'AI_PM_DISABLED':
      return 'AI project manager features are disabled for your agency.'
    case 'AI_MONTHLY_LIMIT_EXCEEDED':
      return 'Monthly AI request limit reached.'
    default:
      return 'Could not parse requirements. Try again.'
  }
}
