import { LeadForm } from '@/modules/crm/components/lead-form'
import { requireManager } from '@/modules/core/services/guards'

export const metadata = { title: 'CRM · New lead' }

export default async function CrmNewLeadPage() {
  await requireManager()
  return <LeadForm />
}
