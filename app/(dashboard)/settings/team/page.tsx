import { PageHeader } from '@/components/shared/page-header'
import { TeamInviteForm } from '@/components/settings/team-invite-form'
import { TeamMembersList } from '@/components/settings/team-members-list'
import { requireAdmin } from '@/lib/auth/guards'
import { listCompanies } from '@/lib/companies/queries'

export const metadata = { title: 'Team' }

export default async function TeamSettingsPage() {
  const { tenant } = await requireAdmin()
  const companies = await listCompanies(tenant.id)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Invite talent managers, talent, and client contacts. Admins have full workspace access."
      />
      <TeamInviteForm companies={companies.map((c) => ({ id: c.id, name: c.name }))} />
      <TeamMembersList />
    </div>
  )
}
