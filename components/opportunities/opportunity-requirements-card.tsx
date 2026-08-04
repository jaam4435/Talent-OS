'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { runBriefParse } from '@/app/actions/ai-pm'
import { Button } from '@/modules/core/components/ui/button'
import { Badge } from '@/modules/core/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import type { ParsedRequirements } from '@/lib/integrations/ai/types'

interface OpportunityRequirementsCardProps {
  opportunityId: string
  requirements: ParsedRequirements | null
}

export function OpportunityRequirementsCard({
  opportunityId,
  requirements,
}: OpportunityRequirementsCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleParse() {
    startTransition(async () => {
      await runBriefParse(opportunityId)
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" />
          Parsed requirements
        </CardTitle>
        <Button size="sm" variant="outline" disabled={isPending} onClick={handleParse}>
          {isPending ? 'Parsing...' : 'Re-parse brief'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {!requirements ? (
          <p className="text-muted-foreground">
            No structured requirements yet. Re-parse the brief to extract skills and deliverables.
          </p>
        ) : (
          <>
            <p>{requirements.summary}</p>
            <div className="flex flex-wrap gap-1">
              {requirements.skills.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
            {requirements.deliverables.length ? (
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {requirements.deliverables.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
