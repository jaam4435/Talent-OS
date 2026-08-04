import Link from 'next/link'
import { Suspense } from 'react'
import { Plus, Target } from 'lucide-react'
import { listCrmLeads } from '@/lib/queries/crm.queries'
import { CrmListFilters } from '@/modules/crm/components/crm-list-filters'
import { Button } from '@/modules/core/components/ui/button'
import { Badge } from '@/modules/core/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/modules/core/components/shared/data-table'
import { EmptyState } from '@/modules/core/components/shared/empty-state'
import { Pagination } from '@/modules/core/components/shared/pagination'
import { formatCurrency, formatDate } from '@/modules/core/utils/format'
import { requireManager } from '@/modules/core/services/guards'
import type { CrmLead } from '@/modules/crm/types'

export const metadata = { title: 'CRM · Leads' }

const leadColumns: DataTableColumn<CrmLead>[] = [
  {
    id: 'title',
    header: 'Lead',
    cell: (row) => (
      <>
        <Link href={`/crm/leads/${row.id}`} className="font-medium hover:underline">
          {row.title}
        </Link>
        <p className="text-sm text-muted-foreground">{row.source ?? 'No source'}</p>
      </>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: (row) => (
      <Badge variant="secondary" className="capitalize">
        {row.status}
      </Badge>
    ),
  },
  {
    id: 'value',
    header: 'Estimate',
    cell: (row) =>
      row.valueEstimate != null ? formatCurrency(row.valueEstimate, row.currency) : '—',
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: (row) => formatDate(row.updatedAt),
  },
]

export default async function CrmLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { tenant } = await requireManager()
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))
  const limit = 20

  const leads = await listCrmLeads(tenant.id, {
    page,
    limit,
    q: typeof params.q === 'string' ? params.q : undefined,
    status: typeof params.status === 'string' ? params.status : undefined,
  })

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <Button asChild>
          <Link href="/crm/leads/new">
            <Plus className="mr-2 h-4 w-4" />
            New lead
          </Link>
        </Button>
      </div>

      <Suspense fallback={null}>
        <CrmListFilters
          pathname="/crm/leads"
          fields={[
            {
              id: 'q',
              label: 'Search',
              type: 'text',
              placeholder: 'Lead title...',
              colSpan: 2,
            },
            {
              id: 'status',
              label: 'Status',
              type: 'select',
              options: [
                { value: '', label: 'All' },
                { value: 'new', label: 'New' },
                { value: 'contacted', label: 'Contacted' },
                { value: 'qualified', label: 'Qualified' },
                { value: 'unqualified', label: 'Unqualified' },
                { value: 'converted', label: 'Converted' },
              ],
            },
          ]}
        />
      </Suspense>

      {!leads.data.length ? (
        <EmptyState
          icon={Target}
          title="No leads found"
          description="Create your first lead or adjust filters."
          action={
            <Button asChild>
              <Link href="/crm/leads/new">New lead</Link>
            </Button>
          }
        />
      ) : (
        <>
          <DataTable columns={leadColumns} data={leads.data} getRowKey={(row) => row.id} />
          <Suspense fallback={null}>
            <Pagination page={page} hasMore={leads.hasMore} pathname="/crm/leads" />
          </Suspense>
        </>
      )}
    </div>
  )
}
