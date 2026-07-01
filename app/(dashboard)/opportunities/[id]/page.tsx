import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { AiMatchPanel } from '@/components/opportunities/ai-match-panel'
import { createClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/auth/session'
import { isManager } from '@/lib/auth/permissions'
import { getTalentMatchResults } from '@/lib/integrations/ai/matching'
import type { Tables } from '@/types/database'

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { tenant } = await requireTenant()
  const supabase = await createClient()

  const { data } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  const opportunity = data as Tables<'opportunities'> | null

  if (!opportunity) notFound()

  const { data: recipients } = await supabase
    .from('opportunity_recipients')
    .select('id, response, freelancer_id')
    .eq('opportunity_id', id)

  const freelancerIds = recipients?.map((r) => r.freelancer_id) ?? []
  const { data: freelancers } = freelancerIds.length
    ? await supabase
        .from('freelancers')
        .select('id, full_name, email')
        .in('id', freelancerIds)
    : { data: [] }

  const freelancerMap = new Map(freelancers?.map((f) => [f.id, f]) ?? [])

  const matchResults = isManager(tenant.role)
    ? await getTalentMatchResults(id, tenant.id)
    : null

  return (
    <div>
      <PageHeader title={opportunity.title} description={opportunity.description ?? undefined}>
        {isManager(tenant.role) ? (
          <Button asChild variant="outline">
            <Link href={`/opportunities/${id}/shortlist`}>View shortlist</Link>
          </Button>
        ) : null}
      </PageHeader>

      <div className="mb-6 flex gap-2">
        <Badge className="capitalize">{opportunity.status}</Badge>
        {opportunity.client_name ? (
          <Badge variant="outline">{opportunity.client_name}</Badge>
        ) : null}
      </div>

      {matchResults ? (
        <div className="mb-6">
          <AiMatchPanel
            opportunityId={id}
            initialScores={matchResults.scores}
            initialRequest={matchResults.latestRequest}
          />
        </div>
      ) : null}

      <div className="rounded-lg border">
        <div className="border-b p-4 font-medium">Responses</div>
        {!recipients?.length ? (
          <p className="p-4 text-sm text-muted-foreground">No recipients yet</p>
        ) : (
          <ul className="divide-y">
            {recipients.map((r) => {
              const freelancer = freelancerMap.get(r.freelancer_id)
              return (
                <li key={r.id} className="flex items-center justify-between p-4 text-sm">
                  <div>
                    <p className="font-medium">{freelancer?.full_name}</p>
                    <p className="text-muted-foreground">{freelancer?.email}</p>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {r.response}
                  </Badge>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
