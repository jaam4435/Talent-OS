import { notFound } from 'next/navigation'
import { getCrmCompanyDetail } from '@/lib/queries/crm.queries'
import { CompanyDetail } from '@/modules/crm/components/company-detail'
import { requireManager } from '@/modules/core/services/guards'

export const metadata = { title: 'CRM · Company' }

export default async function CrmCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { tenant } = await requireManager()
  const { id } = await params
  const detail = await getCrmCompanyDetail(tenant.id, id)
  if (!detail) notFound()

  return (
    <CompanyDetail
      company={detail.company}
      contacts={detail.contacts}
      deals={detail.deals}
      linkedOpportunityIds={detail.linkedOpportunityIds}
    />
  )
}
