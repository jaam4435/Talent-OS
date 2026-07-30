import { redirect } from 'next/navigation'
import { PageHeader } from '@/modules/core/components/shared/page-header'
import { TalentProfileForm } from '@/components/talent/talent-profile-form'
import { PortfolioGallery } from '@/components/talent/portfolio-gallery'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { requireTenant } from '@/modules/core/services/session'
import { getOwnFreelancerId } from '@/app/actions/freelancers'
import { getPortfolioItems } from '@/lib/queries/talent.queries'
import { getTalentProfile } from '@/lib/queries/talent.queries'

export const metadata = { title: 'My profile' }

export default async function ProfilePage() {
  const { tenant } = await requireTenant()
  const freelancerId = await getOwnFreelancerId()

  if (!freelancerId) {
    return (
      <div>
        <PageHeader
          title="My profile"
          description="Your freelancer profile is not linked yet. Contact your agency admin."
        />
      </div>
    )
  }

  const freelancer = await getTalentProfile(freelancerId, tenant.id)
  if (!freelancer) redirect('/dashboard')

  const portfolioItems = await getPortfolioItems(freelancerId)

  return (
    <div>
      <PageHeader
        title="My profile"
        description="Keep your skills, bio, and portfolio up to date"
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile details</CardTitle>
          </CardHeader>
          <CardContent>
            <TalentProfileForm
              mode="edit"
              freelancerId={freelancerId}
              defaultCurrency={tenant?.currency ?? freelancer.currency}
              showManagerFields={false}
              initial={{
                fullName: freelancer.full_name,
                email: freelancer.email,
                discipline: freelancer.discipline as import('@/modules/core/types/enums').DisciplineType,
                skills: freelancer.skills ?? [],
                tags: freelancer.tags ?? [],
                bio: freelancer.bio ?? undefined,
                portfolioUrl: freelancer.portfolio_url ?? undefined,
                availability: freelancer.availability as import('@/modules/core/types/enums').AvailabilityStatus,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            <PortfolioGallery freelancerId={freelancerId} items={portfolioItems} canEdit />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
