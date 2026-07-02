import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { AiMatchPanel } from '@/components/opportunities/ai-match-panel'
import { ShortlistBoard } from '@/components/opportunities/shortlist-board'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/auth/session'
import { isManager } from '@/lib/auth/permissions'
import { getTalentMatchResults } from '@/lib/integrations/ai/matching'
import { getShortlistItems } from '@/lib/shortlists/queries'
import { getShortlistSummaryResult } from '@/lib/integrations/ai/summary'
import { AddRespondentsButton } from '@/components/opportunities/add-respondents-button'
import { ShortlistSummarySection } from '@/components/opportunities/shortlist-summary-section'

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

  const matchResults = await getTalentMatchResults(id, tenant.id)
  const { shortlistId, items } = await getShortlistItems(id, tenant.id)
  const shortlistSummary = await getShortlistSummaryResult(id, tenant.id)

  const { count: interestedCount } = await supabase
    .from('opportunity_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('opportunity_id', id)
    .eq('response', 'interested')

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

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge className="capitalize">{opportunity.status}</Badge>
        {shortlistId ? <Badge variant="outline">Shortlist active</Badge> : null}
        {(interestedCount ?? 0) > 0 ? (
          <AddRespondentsButton opportunityId={id} count={interestedCount ?? 0} />
        ) : null}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <AiMatchPanel
          opportunityId={id}
          initialScores={matchResults.scores}
          initialRequest={matchResults.latestRequest}
        />
        <ShortlistSummarySection
          opportunityId={id}
          initialSummary={
            (shortlistSummary.latestRequest?.result as Record<string, unknown> | null) ?? null
          }
          initialRequest={shortlistSummary.latestRequest}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compare candidates</CardTitle>
        </CardHeader>
        <CardContent>
          <ShortlistBoard opportunityId={id} items={items} />
        </CardContent>
      </Card>
    </div>
  )
}
