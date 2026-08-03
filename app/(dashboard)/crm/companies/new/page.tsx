import { CompanyForm } from '@/modules/crm/components/company-form'
import { requireManager } from '@/modules/core/services/guards'

export const metadata = { title: 'CRM · New company' }

export default async function CrmNewCompanyPage() {
  await requireManager()
  return <CompanyForm />
}
