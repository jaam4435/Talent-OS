import {
  listOrganizationDepartments,
  listOrganizationMembers,
  listOrganizationTeams,
} from '@/lib/queries/organization.queries'
import { OrganizationTeamsPanel } from '@/modules/organization/components/organization-teams-panel'
import { requireAdmin } from '@/modules/core/services/guards'

export const metadata = { title: 'Organization · Teams' }

export default async function OrganizationTeamsPage() {
  const { tenant } = await requireAdmin()
  const [teams, departments, members] = await Promise.all([
    listOrganizationTeams(tenant.id, { limit: 100 }),
    listOrganizationDepartments(tenant.id, { limit: 100 }),
    listOrganizationMembers(tenant.id, { limit: 100 }),
  ])

  return (
    <OrganizationTeamsPanel
      teams={teams.data}
      departments={departments.data}
      members={members.data}
    />
  )
}
