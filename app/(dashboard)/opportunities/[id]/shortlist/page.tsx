import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { AiMatchPanel } from '@/components/opportunities/ai-match-panel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/auth/session'
import { isManager } from '@/lib/auth/permissions'
import { getTalentMatchResults } from '@/lib/integrations/ai/matching'

export default async function ShortlistPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { tenant } = await requireTenant()

  if (!isManager(tenant.role)) {
    notFound()
  }

  const supabase = await createClient()
  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('id, title, status, description, budget, client_name')
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  if (!opportunity) notFound()

  const { data: recipients } = await supabase
    .from('opportunity_recipients')
    .select('id, response, freelancer_id')
    .eq('opportunity_id', id)
    .in('response', ['interested', 'pending'])

  const freelancerIds = recipients?.map((r) => r.freelancer_id) ?? []
  const { data: freelancers } = freelancerIds.length
    ? await supabase
        .from('freelancers')
        .select('id, full_name, email, discipline, availability')
        .in('id', freelancerIds)
    : { data: [] }

  const freelancerMap = new Map(freelancers?.map((f) => [f.id, f]) ?? [])
  const matchResults = await getTalentMatchResults(id, tenant.id)

  const { data: shortlist } = await supabase
    .from('shortlists')
    .select('id, status')
    .eq('opportunity_id', id)
    .maybeSingle()

  return (
    <div>
      <PageHeader title="Shortlist" description={`Candidates for ${opportunity.title}`}>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/opportunities/${id}`}>Back to opportunity</Link>
          </Button>
          <Button asChild>
            <Link href={`/projects/new?opportunityId=${id}`}>Create project</Link>
          </Button>
        </div>
      </PageHeader>

      <div className="mb-4 flex gap-2">
        <Badge className="capitalize">{opportunity.status}</Badge>
        {shortlist ? <Badge variant="outline">Shortlist {shortlist.status}</Badge> : null}
      </div>

      <div className="mb-6">
        <AiMatchPanel
          opportunityId={id}
          initialScores={matchResults.scores}
          initialRequest={matchResults.latestRequest}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Candidates</CardTitle>
        </CardHeader>
        <CardContent>
          {!recipients?.length ? (
            <p className="text-sm text-muted-foreground">
              No recipients yet. Broadcast this opportunity to collect responses.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {recipients.map((recipient) => {
                const freelancer = freelancerMap.get(recipient.freelancer_id)
                if (!freelancer) return null

                const assignUrl = `/projects/new?opportunityId=${id}&freelancerId=${freelancer.id}`

                return (
                  <li
                    key={recipient.id}
                    className="flex flex-wrap items-center justify-between gap-4 p-4"
                  >
                    <div>
                      <p className="font-medium">{freelancer.full_name}</p>
                      <p className="text-sm text-muted-foreground">{freelancer.email}</p>
                      <div className="mt-2 flex gap-2">
                        <Badge variant="outline" className="capitalize">
                          {freelancer.discipline}
                        </Badge>
                        <Badge variant="secondary" className="capitalize">
                          {recipient.response}
                        </Badge>
                      </div>
                    </div>
                    <Button asChild size="sm">
                      <Link href={assignUrl}>Assign project</Link>
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
