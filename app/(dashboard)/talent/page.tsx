import Link from 'next/link'
import { Suspense } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/modules/core/components/ui/button'
import { Badge } from '@/modules/core/components/ui/badge'
import { EmptyState, PageHeader } from '@/modules/core/components/shared/page-header'
import { TalentSearchFilters } from '@/components/talent/talent-search-filters'
import { createClient } from '@/modules/core/utils/supabase/server'
import { requireTenant } from '@/modules/core/services/session'
import { isManager } from '@/modules/core/services/permissions'
import { searchTalentRoster } from '@/lib/talent/queries'
import { formatCurrency } from '@/modules/core/utils/format'
import { notFound } from 'next/navigation'

export const metadata = { title: 'Talent' }

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

  return (
    <div>
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
          title="No freelancers found"
          description="Try adjusting filters or add your first freelancer."
          action={
            <Button asChild>
              <Link href="/talent/new">Add talent</Link>
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Skills</th>
                <th className="p-4 font-medium">Discipline</th>
                <th className="p-4 font-medium">Rate</th>
                <th className="p-4 font-medium">Availability</th>
                <th className="p-4 font-medium">Rating</th>
              </tr>
            </thead>
            <tbody>
              {freelancers.map((f) => (
                <tr key={f.id} className="border-b last:border-0">
                  <td className="p-4">
                    <Link href={`/talent/${f.id}`} className="font-medium hover:underline">
                      {f.full_name}
                    </Link>
                    <p className="text-muted-foreground">{f.email}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex max-w-xs flex-wrap gap-1">
                      {(f.skills ?? []).slice(0, 4).map((skill: string) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 capitalize">{f.discipline}</td>
                  <td className="p-4">
                    {f.day_rate ? formatCurrency(Number(f.day_rate), f.currency) : '—'}
                  </td>
                  <td className="p-4">
                    <Badge variant="secondary" className="capitalize">
                      {f.availability}
                    </Badge>
                  </td>
                  <td className="p-4">{f.internal_rating ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
