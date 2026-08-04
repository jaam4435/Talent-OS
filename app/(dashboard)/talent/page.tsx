import Link from 'next/link'
import { Suspense } from 'react'
import { Plus, Users } from 'lucide-react'
import { Button } from '@/modules/core/components/ui/button'
import { Badge } from '@/modules/core/components/ui/badge'
import { BreadcrumbNav } from '@/modules/core/components/navigation/breadcrumb-nav'
import { DataTable, type DataTableColumn } from '@/modules/core/components/shared/data-table'
import { EmptyState } from '@/modules/core/components/shared/empty-state'
import { PageHeader } from '@/modules/core/components/shared/page-header'
import { TalentPagination } from '@/components/talent/talent-pagination'
import { TalentSearchFilters } from '@/components/talent/talent-search-filters'
import { requireTenant } from '@/modules/core/services/session'
import { isManager } from '@/modules/core/services/permissions'
import { searchTalentRoster, type TalentRow } from '@/lib/queries/talent.queries'
import { formatCurrency } from '@/modules/core/utils/format'
import { notFound } from 'next/navigation'

export const metadata = { title: 'Talent' }

const talentColumns: DataTableColumn<TalentRow>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: (freelancer) => (
      <>
        <Link href={`/talent/${freelancer.id}`} className="font-medium hover:underline">
          {freelancer.full_name}
        </Link>
        <p className="text-muted-foreground">{freelancer.email}</p>
      </>
    ),
  },
  {
    id: 'skills',
    header: 'Skills',
    cell: (freelancer) => (
      <div className="flex max-w-xs flex-wrap gap-1">
        {(freelancer.skills ?? []).slice(0, 4).map((skill: string) => (
          <Badge key={skill} variant="outline" className="text-xs">
            {skill}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    id: 'discipline',
    header: 'Discipline',
    cell: (freelancer) => <span className="capitalize">{freelancer.discipline}</span>,
  },
  {
    id: 'rate',
    header: 'Rate',
    cell: (freelancer) =>
      freelancer.day_rate ? formatCurrency(Number(freelancer.day_rate), freelancer.currency) : '—',
  },
  {
    id: 'availability',
    header: 'Availability',
    cell: (freelancer) => (
      <Badge variant="secondary" className="capitalize">
        {freelancer.availability}
      </Badge>
    ),
  },
  {
    id: 'rating',
    header: 'Rating',
    cell: (freelancer) => freelancer.internal_rating ?? '—',
  },
]

export default async function TalentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { tenant } = await requireTenant()
  if (!isManager(tenant.role)) notFound()

  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))
  const limit = 20
  const offset = (page - 1) * limit

  const freelancers = await searchTalentRoster(tenant.id, {
    query: typeof params.q === 'string' ? params.q : undefined,
    discipline: typeof params.discipline === 'string' ? params.discipline : undefined,
    availability: typeof params.availability === 'string' ? params.availability : undefined,
    sort: typeof params.sort === 'string' ? params.sort : 'rating',
    limit,
    offset,
  })

  const hasMore = freelancers.length === limit

  return (
    <div>
      <BreadcrumbNav
        items={[
          { label: 'Supply', href: '/talent' },
          { label: 'Talent roster' },
        ]}
      />

      <PageHeader title="Talent" description="Manage your freelancer roster">
        <Button asChild>
          <Link href="/talent/new">
            <Plus className="mr-2 h-4 w-4" />
            Add talent
          </Link>
        </Button>
      </PageHeader>

      <Suspense fallback={null}>
        <TalentSearchFilters />
      </Suspense>

      {!freelancers.length ? (
        <EmptyState
          icon={Users}
          title="No freelancers found"
          description="Try adjusting filters or add your first freelancer."
          action={
            <Button asChild>
              <Link href="/talent/new">Add talent</Link>
            </Button>
          }
        />
      ) : (
        <>
          <DataTable
            columns={talentColumns}
            data={freelancers}
            getRowKey={(row) => row.id}
          />
          <Suspense fallback={null}>
            <TalentPagination page={page} hasMore={hasMore} />
          </Suspense>
        </>
      )}
    </div>
  )
}
