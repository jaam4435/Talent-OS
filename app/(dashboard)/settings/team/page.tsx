import { PageHeader } from '@/components/shared/page-header'
import { TeamInviteForm } from '@/components/settings/team-invite-form'
import { TeamMembersList } from '@/components/settings/team-members-list'
import { requireAdmin } from '@/lib/auth/guards'

export const metadata = { title: 'Team' }

export default async function TeamSettingsPage() {
  await requireAdmin()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Invite talent managers and freelancers. Admins have full workspace access."
      />
      <TeamInviteForm />
      <TeamMembersList />
    </div>
  )
}
