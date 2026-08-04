import Link from 'next/link'
import { Suspense } from 'react'
import { FileText } from 'lucide-react'
import { listCrmContracts } from '@/lib/queries/crm.queries'
import { CrmListFilters } from '@/modules/crm/components/crm-list-filters'
import { Badge } from '@/modules/core/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/modules/core/components/shared/data-table'
import { EmptyState } from '@/modules/core/components/shared/empty-state'
import { Pagination } from '@/modules/core/components/shared/pagination'
import { formatCurrency, formatDate } from '@/modules/core/utils/format'
import { requireManager } from '@/modules/core/services/guards'
import type { CrmContract } from '@/modules/crm/types'

export const metadata = { title: 'CRM · Contracts' }

const contractColumns: DataTableColumn<CrmContract>[] = [
  {
    id: 'title',
    header: 'Contract',
    cell: (row) => (
      <>
        <p className="font-medium">{row.title}</p>
        {row.dealId ? (
          <Link href={`/crm/deals/${row.dealId}`} className="text-sm text-muted-foreground hover:underline">
            View deal
          </Link>
        ) : null}
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
    header: 'Value',
    cell: (row) => (row.value != null ? formatCurrency(row.value, row.currency) : '—'),
  },
  {
    id: 'period',
    header: 'Period',
    cell: (row) => {
      if (!row.startsOn && !row.endsOn) return '—'
      const start = row.startsOn ? formatDate(row.startsOn) : '—'
      const end = row.endsOn ? formatDate(row.endsOn) : '—'
      return `${start} – ${end}`
    },
  },
]

export default async function CrmContractsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { tenant } = await requireManager()
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))
  const limit = 20

  const contracts = await listCrmContracts(tenant.id, {
    page,
    limit,
    status: typeof params.status === 'string' ? params.status : undefined,
    company_id: typeof params.company_id === 'string' ? params.company_id : undefined,
  })

  return (
    <div>
      <Suspense fallback={null}>
        <CrmListFilters
          pathname="/crm/contracts"
          fields={[
            {
              id: 'status',
              label: 'Status',
              type: 'select',
              options: [
                { value: '', label: 'All' },
                { value: 'draft', label: 'Draft' },
                { value: 'sent', label: 'Sent' },
                { value: 'signed', label: 'Signed' },
                { value: 'expired', label: 'Expired' },
                { value: 'canceled', label: 'Canceled' },
              ],
            },
          ]}
        />
      </Suspense>

      {!contracts.data.length ? (
        <EmptyState
          icon={FileText}
          title="No contracts found"
          description="Contracts are created from signed deals or via the CRM API."
        />
      ) : (
        <>
          <DataTable columns={contractColumns} data={contracts.data} getRowKey={(row) => row.id} />
          <Suspense fallback={null}>
            <Pagination page={page} hasMore={contracts.hasMore} pathname="/crm/contracts" />
          </Suspense>
        </>
      )}
    </div>
  )
}
