import { listOrganizationDepartments } from '@/lib/queries/organization.queries'
import { OrganizationDepartmentsPanel } from '@/modules/organization/components/organization-departments-panel'
import { requireAdmin } from '@/modules/core/services/guards'

export const metadata = { title: 'Organization · Departments' }

export default async function OrganizationDepartmentsPage() {
  const { tenant } = await requireAdmin()
  const departments = await listOrganizationDepartments(tenant.id, { limit: 100 })

  return <OrganizationDepartmentsPanel departments={departments.data} />
}
