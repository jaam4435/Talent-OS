import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { AiMatchPanel } from '@/components/opportunities/ai-match-panel'
import { Button } from '@/components/ui/button'
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
    .select('id, title')
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  if (!opportunity) notFound()

  const matchResults = await getTalentMatchResults(id, tenant.id)

  return (
    <div>
      <PageHeader title="Shortlist" description={`Candidates for ${opportunity.title}`}>
        <Button asChild variant="outline">
          <Link href={`/opportunities/${id}`}>Back to opportunity</Link>
        </Button>
      </PageHeader>

      <div className="mb-6">
        <AiMatchPanel
          opportunityId={id}
          initialScores={matchResults.scores}
          initialRequest={matchResults.latestRequest}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shortlist board</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use AI matches above to add candidates. Drag-and-drop shortlist UI coming next.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
