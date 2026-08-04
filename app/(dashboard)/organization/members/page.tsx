import { listOrganizationMembers } from '@/lib/queries/organization.queries'
import { OrganizationMembersPanel } from '@/modules/organization/components/organization-members-panel'
import { requireAdmin } from '@/modules/core/services/guards'

export const metadata = { title: 'Organization · Members' }

export default async function OrganizationMembersPage() {
  const { tenant } = await requireAdmin()
  const members = await listOrganizationMembers(tenant.id, { limit: 100 })

  return <OrganizationMembersPanel members={members.data} />
}
