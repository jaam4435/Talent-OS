import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { TalentProfileForm } from '@/components/talent/talent-profile-form'
import { requireManager } from '@/lib/auth/guards'

export const metadata = { title: 'Add talent' }

export default async function NewTalentPage() {
  const { tenant } = await requireManager()

  return (
    <div>
      <PageHeader title="Add talent" description="Create a new freelancer profile">
        <Link href="/talent" className="text-sm text-muted-foreground hover:underline">
          Back to roster
        </Link>
      </PageHeader>
      <TalentProfileForm mode="create" defaultCurrency={tenant.currency} />
    </div>
  )
}
