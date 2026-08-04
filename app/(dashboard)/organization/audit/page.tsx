import { listOrganizationAuditLogs } from '@/lib/queries/organization.queries'
import { OrganizationAuditPanel } from '@/modules/organization/components/organization-audit-panel'
import { requireAdmin } from '@/modules/core/services/guards'

export const metadata = { title: 'Organization · Audit log' }

export default async function OrganizationAuditPage() {
  const { tenant } = await requireAdmin()
  const audit = await listOrganizationAuditLogs(tenant.id, { limit: 100 })

  return <OrganizationAuditPanel entries={audit.data} />
}
