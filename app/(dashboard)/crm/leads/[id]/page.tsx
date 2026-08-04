import { notFound } from 'next/navigation'
import { getCrmLead } from '@/lib/queries/crm.queries'
import { LeadDetailPanel } from '@/modules/crm/components/lead-detail-panel'
import { requireManager } from '@/modules/core/services/guards'

export const metadata = { title: 'CRM · Lead' }

export default async function CrmLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { tenant } = await requireManager()
  const { id } = await params
  const lead = await getCrmLead(tenant.id, id)
  if (!lead) notFound()

  return <LeadDetailPanel lead={lead} />
}
