'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CrmLead } from '@/modules/crm/types'
import { useCrm } from '@/modules/crm/hooks/use-crm'
import { LeadForm } from '@/modules/crm/components/lead-form'
import { Badge } from '@/modules/core/components/ui/badge'
import { Button } from '@/modules/core/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { formatCurrency, formatDate, formatRelative } from '@/modules/core/utils/format'

interface LeadDetailPanelProps {
  lead: CrmLead
}

export function LeadDetailPanel({ lead }: LeadDetailPanelProps) {
  const router = useRouter()
  const { api, error, isPending, run } = useCrm()

  const converted = lead.status === 'converted'

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>{lead.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Created {formatRelative(lead.createdAt)} · Updated {formatDate(lead.updatedAt)}
              </p>
            </div>
            <Badge className="capitalize">{lead.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Source</p>
              <p className="text-sm text-muted-foreground">{lead.source ?? '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Estimated value</p>
              <p className="text-sm text-muted-foreground">
                {lead.valueEstimate != null
                  ? formatCurrency(lead.valueEstimate, lead.currency)
                  : '—'}
              </p>
            </div>
          </div>
          {lead.description ? (
            <div>
              <p className="text-sm font-medium">Description</p>
              <p className="text-sm text-muted-foreground">{lead.description}</p>
            </div>
          ) : null}
          {lead.companyId ? (
            <p className="text-sm">
              Linked company:{' '}
              <Link href={`/crm/companies/${lead.companyId}`} className="hover:underline">
                View company
              </Link>
            </p>
          ) : null}
          {converted && lead.convertedAt ? (
            <p className="text-sm text-muted-foreground">Converted {formatDate(lead.convertedAt)}</p>
          ) : null}
        </CardContent>
      </Card>

      {!converted ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={isPending}
              onClick={() =>
                run(async () => {
                  const result = await api.convertLead(lead.id, {
                    create_company: true,
                    create_deal: true,
                    mark_client: false,
                  })
                  if (result.dealId) router.push(`/crm/deals/${result.dealId}`)
                  else if (result.companyId) router.push(`/crm/companies/${result.companyId}`)
                  else router.refresh()
                })
              }
            >
              Convert lead
            </Button>
          </div>
          <LeadForm
            mode="edit"
            leadId={lead.id}
            initial={{
              title: lead.title,
              source: lead.source,
              status: lead.status === 'converted' ? 'qualified' : lead.status,
              valueEstimate: lead.valueEstimate,
              currency: lead.currency,
              description: lead.description,
            }}
          />
        </>
      ) : null}
    </div>
  )
}
