'use client'

import Link from 'next/link'
import type { CrmCompany, CrmContact, CrmDeal } from '@/modules/crm/types'
import { useCrm } from '@/modules/crm/hooks/use-crm'
import { Badge } from '@/modules/core/components/ui/badge'
import { Button } from '@/modules/core/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { DataTable, type DataTableColumn } from '@/modules/core/components/shared/data-table'
import { formatCurrency, formatDate } from '@/modules/core/utils/format'

interface CompanyDetailProps {
  company: CrmCompany
  contacts: CrmContact[]
  deals: CrmDeal[]
  linkedOpportunityIds: string[]
}

export function CompanyDetail({
  company,
  contacts,
  deals,
  linkedOpportunityIds,
}: CompanyDetailProps) {
  const { api, error, isPending, run } = useCrm()

  const contactColumns: DataTableColumn<CrmContact>[] = [
    {
      id: 'name',
      header: 'Contact',
      cell: (row) => (
        <>
          <p className="font-medium">
            {row.firstName} {row.lastName ?? ''}
          </p>
          <p className="text-sm text-muted-foreground">{row.email ?? '—'}</p>
        </>
      ),
    },
    {
      id: 'role',
      header: 'Title',
      cell: (row) => row.jobTitle ?? '—',
    },
    {
      id: 'phone',
      header: 'Phone',
      cell: (row) => row.phone ?? '—',
    },
    {
      id: 'primary',
      header: 'Primary',
      cell: (row) =>
        row.isPrimary ? (
          <Badge variant="secondary">Primary</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ]

  const dealColumns: DataTableColumn<CrmDeal>[] = [
    {
      id: 'title',
      header: 'Deal',
      cell: (row) => (
        <Link href={`/crm/deals/${row.id}`} className="font-medium hover:underline">
          {row.title}
        </Link>
      ),
    },
    {
      id: 'stage',
      header: 'Stage',
      cell: (row) => row.stageName ?? '—',
    },
    {
      id: 'value',
      header: 'Value',
      cell: (row) => (row.value != null ? formatCurrency(row.value, row.currency) : '—'),
    },
    {
      id: 'updated',
      header: 'Updated',
      cell: (row) => formatDate(row.updatedAt),
    },
  ]

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>{company.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {company.industry ?? 'Industry not set'} · Updated {formatDate(company.updatedAt)}
              </p>
            </div>
            <Badge className="capitalize">{company.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium">Primary contact</p>
            <p className="text-sm text-muted-foreground">
              {company.contactName ?? '—'}
              {company.contactEmail ? ` · ${company.contactEmail}` : ''}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Website</p>
            <p className="text-sm text-muted-foreground">
              {company.website ? (
                <a href={company.website} target="_blank" rel="noreferrer" className="hover:underline">
                  {company.website}
                </a>
              ) : (
                '—'
              )}
            </p>
          </div>
          {company.notes ? (
            <div className="md:col-span-2">
              <p className="text-sm font-medium">Notes</p>
              <p className="text-sm text-muted-foreground">{company.notes}</p>
            </div>
          ) : null}
          <div className="md:col-span-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isPending || company.status === 'client'}
              onClick={() => run(() => api.updateCompany(company.id, { status: 'client' }))}
            >
              Mark as client
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Contacts</h2>
        {contacts.length ? (
          <DataTable columns={contactColumns} data={contacts} getRowKey={(row) => row.id} />
        ) : (
          <p className="text-sm text-muted-foreground">No contacts linked to this company yet.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Deals</h2>
        {deals.length ? (
          <DataTable columns={dealColumns} data={deals} getRowKey={(row) => row.id} />
        ) : (
          <p className="text-sm text-muted-foreground">No deals linked to this company yet.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Linked opportunities</h2>
        {linkedOpportunityIds.length ? (
          <ul className="space-y-2">
            {linkedOpportunityIds.map((opportunityId) => (
              <li key={opportunityId}>
                <Link href={`/opportunities/${opportunityId}`} className="text-sm hover:underline">
                  View opportunity {opportunityId.slice(0, 8)}…
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No opportunities linked via CRM deals. Legacy opportunities remain available under Demand.
          </p>
        )}
      </section>
    </div>
  )
}
