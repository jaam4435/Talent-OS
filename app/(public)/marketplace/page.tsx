import Link from 'next/link'
import { createAdminServices } from '@/lib/services/factory'
import { Badge } from '@/modules/core/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { EmptyState } from '@/modules/core/components/shared/empty-state'
import { Users } from 'lucide-react'
import { DISCIPLINES } from '@/modules/core/utils/constants'

export const metadata = { title: 'Talent Marketplace' }

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))
  const limit = 20

  const services = await createAdminServices()
  const profiles = await services.talentModule.listMarketplaceProfiles({
    page,
    limit,
    q: typeof params.q === 'string' ? params.q : undefined,
    discipline: typeof params.discipline === 'string' ? params.discipline : undefined,
    availability: typeof params.availability === 'string' ? params.availability : undefined,
  })

  return (
    <div>
      <p className="mb-6 text-muted-foreground">
        Discover creative talent across participating organizations. Profiles are anonymized and
        manager-approved.
      </p>

      <form className="mb-8 grid gap-3 md:grid-cols-4" method="get">
        <input
          name="q"
          defaultValue={typeof params.q === 'string' ? params.q : ''}
          placeholder="Search bio or discipline..."
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-2"
        />
        <select
          name="discipline"
          defaultValue={typeof params.discipline === 'string' ? params.discipline : ''}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All disciplines</option>
          {DISCIPLINES.map((discipline) => (
            <option key={discipline} value={discipline}>
              {discipline}
            </option>
          ))}
        </select>
        <select
          name="availability"
          defaultValue={typeof params.availability === 'string' ? params.availability : ''}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Any availability</option>
          <option value="available">Available</option>
          <option value="busy">Busy</option>
          <option value="unavailable">Unavailable</option>
        </select>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground md:col-span-4 md:max-w-[160px]"
        >
          Search
        </button>
      </form>

      {!profiles.data.length ? (
        <EmptyState
          icon={Users}
          title="No marketplace profiles yet"
          description="Managers can publish eligible talent profiles when the marketplace is enabled."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {profiles.data.map((profile) => (
            <Card key={profile.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 text-lg">
                  <span>{profile.displayName}</span>
                  <Badge variant="secondary" className="capitalize">
                    {profile.discipline}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  {profile.bio ?? profile.aiSummary ?? 'No public bio yet.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.slice(0, 6).map((skill) => (
                    <Badge key={skill} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3 text-muted-foreground">
                  <span className="capitalize">{profile.availability}</span>
                  {profile.timezone ? <span>{profile.timezone}</span> : null}
                  <span>{profile.profileCompleteness}% complete</span>
                </div>
                {profile.portfolioUrl ? (
                  <Link
                    href={profile.portfolioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    View portfolio
                  </Link>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {profiles.hasMore ? (
        <div className="mt-8">
          <Link
            href={`/marketplace?page=${page + 1}${
              typeof params.q === 'string' ? `&q=${encodeURIComponent(params.q)}` : ''
            }${
              typeof params.discipline === 'string'
                ? `&discipline=${encodeURIComponent(params.discipline)}`
                : ''
            }${
              typeof params.availability === 'string'
                ? `&availability=${encodeURIComponent(params.availability)}`
                : ''
            }`}
            className="text-sm text-primary hover:underline"
          >
            Next page
          </Link>
        </div>
      ) : null}
    </div>
  )
}
