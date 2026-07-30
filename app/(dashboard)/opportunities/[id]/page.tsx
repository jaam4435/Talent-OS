import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '@/modules/core/components/ui/button'
import { Badge } from '@/modules/core/components/ui/badge'
import { PageHeader } from '@/modules/core/components/shared/page-header'
import { OpportunityRequirementsCard } from '@/components/opportunities/opportunity-requirements-card'
import { AiMatchPanel } from '@/components/opportunities/ai-match-panel'
import { BroadcastPanel } from '@/components/opportunities/broadcast-panel'
import { OpportunityResponseForm } from '@/components/opportunities/opportunity-response-form'
import { requireTenant } from '@/modules/core/services/session'
import { isManager } from '@/modules/core/services/permissions'
import { getOpportunityPageData } from '@/lib/queries/opportunities.queries'
import { getTalentMatchResults } from '@/lib/queries/ai.queries'
import { formatCurrency } from '@/modules/core/utils/format'
import type { ParsedRequirements } from '@/lib/integrations/ai/types'

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { tenant, user } = await requireTenant()
  const manager = isManager(tenant.role)

  const pageData = await getOpportunityPageData(id, tenant.id, user.id, manager)
  if (!pageData) notFound()

  const { opportunity, recipients, freelancerMap, roster, ownRecipient, freelancerIds } = pageData
  const matchResults = manager ? await getTalentMatchResults(id, tenant.id) : null
  const canBroadcast = manager && ['draft', 'open'].includes(opportunity.status)

  return (
    <div>
      <PageHeader title={opportunity.title} description={opportunity.description ?? undefined}>
        {manager ? (
          <Button asChild variant="outline">
            <Link href={`/opportunities/${id}/shortlist`}>View shortlist</Link>
          </Button>
        ) : null}
      </PageHeader>

      <div className="mb-6 flex flex-wrap gap-2">
        <Badge className="capitalize">{opportunity.status}</Badge>
        {opportunity.client_name ? (
          <Badge variant="outline">{opportunity.client_name}</Badge>
        ) : null}
        {opportunity.budget ? (
          <Badge variant="outline">
            {formatCurrency(Number(opportunity.budget), opportunity.currency)}
          </Badge>
        ) : null}
      </div>

      {opportunity.required_skills?.length ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {opportunity.required_skills.map((skill) => (
            <Badge key={skill} variant="secondary">
              {skill}
            </Badge>
          ))}
        </div>
      ) : null}

      {manager ? (
        <div className="mb-6">
          <OpportunityRequirementsCard
            opportunityId={id}
            requirements={
              opportunity.requirements &&
              typeof opportunity.requirements === 'object' &&
              Object.keys(opportunity.requirements).length > 0
                ? (opportunity.requirements as unknown as ParsedRequirements)
                : null
            }
          />
        </div>
      ) : null}

      {matchResults ? (
        <div className="mb-6">
          <AiMatchPanel
            opportunityId={id}
            initialScores={matchResults.scores}
            initialRequest={matchResults.latestRequest}
          />
        </div>
      ) : null}

      {manager && canBroadcast ? (
        <div className="mb-6">
          <BroadcastPanel
            opportunityId={id}
            freelancers={roster}
            existingRecipientIds={freelancerIds}
            canBroadcast={canBroadcast}
          />
        </div>
      ) : null}

      {!manager && ownRecipient ? (
        <div className="mb-6">
          <OpportunityResponseForm
            opportunityId={id}
            currentResponse={ownRecipient.response}
          />
        </div>
      ) : null}

      <div className="rounded-lg border">
        <div className="border-b p-4 font-medium">Broadcast log</div>
        {!recipients.length ? (
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
                    {r.whatsapp_sent_at ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        WhatsApp {r.whatsapp_delivered ? 'delivered' : 'sent'} ·{' '}
                        {new Date(r.whatsapp_sent_at).toLocaleString()}
                      </p>
                    ) : null}
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
