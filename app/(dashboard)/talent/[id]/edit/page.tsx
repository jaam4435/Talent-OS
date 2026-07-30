import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/modules/core/components/shared/page-header'
import { TalentProfileForm } from '@/components/talent/talent-profile-form'
import { requireManager } from '@/modules/core/services/guards'
import { getTalentProfile } from '@/lib/queries/talent.queries'

export default async function EditTalentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { tenant } = await requireManager()

  const freelancer = await getTalentProfile(id, tenant.id)
  if (!freelancer) notFound()

  return (
    <div>
      <PageHeader title={`Edit ${freelancer.full_name}`} description="Update freelancer profile">
        <Link href={`/talent/${id}`} className="text-sm text-muted-foreground hover:underline">
          Cancel
        </Link>
      </PageHeader>
      <TalentProfileForm
        mode="edit"
        freelancerId={id}
        defaultCurrency={tenant.currency}
        initial={{
          fullName: freelancer.full_name,
          email: freelancer.email,
          phone: freelancer.phone ?? undefined,
          discipline: freelancer.discipline as import('@/modules/core/types/enums').DisciplineType,
          skills: freelancer.skills ?? [],
          tags: freelancer.tags ?? [],
          dayRate: freelancer.day_rate ? Number(freelancer.day_rate) : undefined,
          bio: freelancer.bio ?? undefined,
          portfolioUrl: freelancer.portfolio_url ?? undefined,
          availability: freelancer.availability as import('@/modules/core/types/enums').AvailabilityStatus,
          internalRating: freelancer.internal_rating ? Number(freelancer.internal_rating) : undefined,
          internalNotes: freelancer.internal_notes ?? undefined,
        }}
      />
    </div>
  )
}
