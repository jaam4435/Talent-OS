import { notFound } from 'next/navigation'
import { getCrmDeal, listCrmActivities } from '@/lib/queries/crm.queries'
import { DealDetailPanel } from '@/modules/crm/components/deal-detail-panel'
import { requireManager } from '@/modules/core/services/guards'

export const metadata = { title: 'CRM · Deal' }

export default async function CrmDealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { tenant } = await requireManager()
  const { id } = await params
  const [deal, activities] = await Promise.all([
    getCrmDeal(tenant.id, id),
    listCrmActivities(tenant.id, 'deal', id, { limit: 50 }),
  ])

  if (!deal) notFound()

  return <DealDetailPanel deal={deal} activities={activities.data} />
}
