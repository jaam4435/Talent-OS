import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { TalentProfileForm } from '@/components/talent/talent-profile-form'
import { PortfolioGallery } from '@/components/talent/portfolio-gallery'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/auth/session'
import { getOwnFreelancerId } from '@/app/actions/freelancers'
import { getPortfolioItems } from '@/lib/talent/queries'

export const metadata = { title: 'My profile' }

export default async function ProfilePage() {
  const { tenant, user } = await requireTenant()
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

  const supabase = await createClient()
  const { data: freelancer } = await supabase
    .from('freelancers')
    .select('*')
    .eq('id', freelancerId)
    .maybeSingle()

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
                discipline: freelancer.discipline,
                skills: freelancer.skills ?? [],
                tags: freelancer.tags ?? [],
                bio: freelancer.bio ?? undefined,
                portfolioUrl: freelancer.portfolio_url ?? undefined,
                availability: freelancer.availability,
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
