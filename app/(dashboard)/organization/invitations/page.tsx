import { listCompanies } from '@/lib/companies/queries'
import { listOrganizationInvites } from '@/lib/queries/organization.queries'
import { OrganizationInvitationsPanel } from '@/modules/organization/components/organization-invitations-panel'
import { requireAdmin } from '@/modules/core/services/guards'

export const metadata = { title: 'Organization · Invitations' }

export default async function OrganizationInvitationsPage() {
  const { tenant } = await requireAdmin()
  const [invites, companies] = await Promise.all([
    listOrganizationInvites(tenant.id, { limit: 100 }),
    listCompanies(tenant.id),
  ])

  return (
    <OrganizationInvitationsPanel
      invites={invites.data}
      companies={companies.map((company) => ({ id: company.id, name: company.name }))}
    />
  )
}
