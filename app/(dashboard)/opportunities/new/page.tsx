import { PageHeader } from '@/components/shared/page-header'
import { OpportunityForm } from '@/components/opportunities/opportunity-form'
import { requireManager } from '@/lib/auth/guards'
import { listCompanies } from '@/lib/companies/queries'

export const metadata = { title: 'New opportunity' }

export default async function NewOpportunityPage() {
  const { tenant } = await requireManager()
  const companies = await listCompanies(tenant.id)

  return (
    <div>
      <PageHeader title="New opportunity" description="Create and broadcast a new gig" />
      <OpportunityForm defaultCurrency={tenant.currency} companies={companies} />
    </div>
  )
}
