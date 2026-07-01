import { PageHeader } from '@/components/shared/page-header'
import { OpportunityForm } from '@/components/opportunities/opportunity-form'
import { requireManager } from '@/lib/auth/guards'

export const metadata = { title: 'New opportunity' }

export default async function NewOpportunityPage() {
  const { tenant } = await requireManager()

  return (
    <div>
      <PageHeader title="New opportunity" description="Create and broadcast a new gig" />
      <OpportunityForm defaultCurrency={tenant.currency} />
    </div>
  )
}
