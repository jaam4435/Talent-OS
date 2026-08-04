import Link from 'next/link'
import { Suspense } from 'react'
import { Building2 } from 'lucide-react'
import { listCrmCompanies } from '@/lib/queries/crm.queries'
import { CrmListFilters } from '@/modules/crm/components/crm-list-filters'
import { Badge } from '@/modules/core/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/modules/core/components/shared/data-table'
import { EmptyState } from '@/modules/core/components/shared/empty-state'
import { Pagination } from '@/modules/core/components/shared/pagination'
import { formatDate } from '@/modules/core/utils/format'
import { requireManager } from '@/modules/core/services/guards'
import type { CrmCompany } from '@/modules/crm/types'

export const metadata = { title: 'CRM · Companies' }

const companyColumns: DataTableColumn<CrmCompany>[] = [
  {
    id: 'name',
    header: 'Company',
    cell: (row) => (
      <>
        <Link href={`/crm/companies/${row.id}`} className="font-medium hover:underline">
          {row.name}
        </Link>
        <p className="text-sm text-muted-foreground">{row.industry ?? 'Industry not set'}</p>
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
    id: 'contact',
    header: 'Contact',
    cell: (row) => row.contactEmail ?? row.contactName ?? '—',
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: (row) => formatDate(row.updatedAt),
  },
]

export default async function CrmCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { tenant } = await requireManager()
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))
  const limit = 20

  const companies = await listCrmCompanies(tenant.id, {
    page,
    limit,
    q: typeof params.q === 'string' ? params.q : undefined,
    status: typeof params.status === 'string' ? params.status : undefined,
  })

  return (
    <div>
      <Suspense fallback={null}>
        <CrmListFilters
          pathname="/crm/companies"
          fields={[
            {
              id: 'q',
              label: 'Search',
              type: 'text',
              placeholder: 'Company name...',
              colSpan: 2,
            },
            {
              id: 'status',
              label: 'Status',
              type: 'select',
              options: [
                { value: '', label: 'All' },
                { value: 'prospect', label: 'Prospect' },
                { value: 'active', label: 'Active' },
                { value: 'client', label: 'Client' },
                { value: 'inactive', label: 'Inactive' },
              ],
            },
          ]}
        />
      </Suspense>

      {!companies.data.length ? (
        <EmptyState
          icon={Building2}
          title="No companies found"
          description="Companies appear when leads are converted or created via CRM."
        />
      ) : (
        <>
          <DataTable columns={companyColumns} data={companies.data} getRowKey={(row) => row.id} />
          <Suspense fallback={null}>
            <Pagination page={page} hasMore={companies.hasMore} pathname="/crm/companies" />
          </Suspense>
        </>
      )}
    </div>
  )
}
