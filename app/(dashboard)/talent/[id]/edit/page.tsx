import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { TalentProfileForm } from '@/components/talent/talent-profile-form'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/auth/guards'

export default async function EditTalentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { tenant } = await requireManager()
  const supabase = await createClient()

  const { data: freelancer } = await supabase
    .from('freelancers')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

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
          discipline: freelancer.discipline,
          skills: freelancer.skills ?? [],
          tags: freelancer.tags ?? [],
          dayRate: freelancer.day_rate ? Number(freelancer.day_rate) : undefined,
          bio: freelancer.bio ?? undefined,
          portfolioUrl: freelancer.portfolio_url ?? undefined,
          availability: freelancer.availability,
          internalRating: freelancer.internal_rating ? Number(freelancer.internal_rating) : undefined,
          internalNotes: freelancer.internal_notes ?? undefined,
        }}
      />
    </div>
  )
}
