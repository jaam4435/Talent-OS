import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { PageHeader } from '@/modules/core/components/shared/page-header'
import { PortfolioGallery } from '@/components/talent/portfolio-gallery'
import { Badge } from '@/modules/core/components/ui/badge'
import { Button } from '@/modules/core/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { requireTenant } from '@/modules/core/services/session'
import { isManager } from '@/modules/core/services/permissions'
import { getPortfolioItems, getRatingHistory } from '@/lib/queries/talent.queries'
import { getTalentActivity, getTalentName, getTalentProfile } from '@/lib/queries/talent.queries'
import { formatCurrency } from '@/modules/core/utils/format'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const name = await getTalentName(id)
  return { title: name ?? 'Talent profile' }
}

export default async function TalentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { tenant, user } = await requireTenant()

  const freelancer = await getTalentProfile(id, tenant?.id ?? '')
  if (!freelancer) notFound()

  const isOwnProfile = freelancer.user_id === user.id
  const canManage = isManager(tenant?.role ?? 'freelancer')

  if (!canManage && !isOwnProfile) notFound()

  const [portfolioItems, ratingHistory, activity] = await Promise.all([
    getPortfolioItems(id),
    canManage ? getRatingHistory(id) : Promise.resolve([]),
    getTalentActivity(id),
  ])

  return (
    <div>
      <PageHeader title={freelancer.full_name} description={freelancer.email}>
        {canManage ? (
          <Button asChild variant="outline">
            <Link href={`/talent/${id}/edit`}>Edit profile</Link>
          </Button>
        ) : null}
      </PageHeader>

      <div className="mb-6 flex flex-wrap gap-2">
        <Badge className="capitalize">{freelancer.discipline}</Badge>
        <Badge variant="secondary" className="capitalize">
          {freelancer.availability}
        </Badge>
        {freelancer.internal_rating ? (
          <Badge variant="outline">Rating {freelancer.internal_rating}</Badge>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {freelancer.bio ? <p>{freelancer.bio}</p> : <p className="text-muted-foreground">No bio yet.</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Day rate</span>
                <span>
                  {freelancer.day_rate
                    ? formatCurrency(Number(freelancer.day_rate), freelancer.currency)
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{freelancer.phone ?? '—'}</span>
              </div>
            </div>
            {freelancer.portfolio_url ? (
              <a
                href={freelancer.portfolio_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                External portfolio <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {freelancer.skills?.length ? (
              freelancer.skills.map((skill: string) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No skills listed</p>
            )}
          </CardContent>
        </Card>
      </div>

      {freelancer.tags?.length ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {freelancer.tags.map((tag: string) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <PortfolioGallery
            freelancerId={id}
            items={portfolioItems}
            canEdit={canManage || isOwnProfile}
          />
        </CardContent>
      </Card>

      {canManage && freelancer.internal_notes ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Internal notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{freelancer.internal_notes}</CardContent>
        </Card>
      ) : null}

      {canManage && ratingHistory.length ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Rating history</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {ratingHistory.map((entry) => (
                <li key={entry.id} className="py-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{entry.rating} / 5</span>
                    <span className="text-muted-foreground">
                      {entry.ratedByName ?? 'Manager'} · {new Date(entry.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {entry.note ? <p className="mt-1 text-muted-foreground">{entry.note}</p> : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {activity.length ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {activity.map((entry, index) => (
                <li key={index} className="py-2 capitalize text-muted-foreground">
                  {entry.action.replace('_', ' ')} · {new Date(entry.created_at).toLocaleString()}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
