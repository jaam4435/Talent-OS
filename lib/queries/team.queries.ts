import { createRepositories } from '@/lib/repositories/factory'
import { formatRole } from '@/modules/core/services/roles'
import type { UserRole } from '@/modules/core/types/enums'

export async function getTeamMembersPageData(tenantId: string) {
  const repos = await createRepositories()
  const [members, invites] = await Promise.all([
    repos.tenantMember.listWithProfiles(tenantId),
    repos.memberInvite.listPending(tenantId),
  ])

  const mappedMembers = members.map((member) => {
    const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles
    return {
      id: member.id,
      role: member.role as UserRole,
      roleLabel: formatRole(member.role as UserRole),
      status: member.status,
      joinedAt: member.joined_at,
      email: profile?.email ?? '',
      fullName: profile?.full_name ?? null,
    }
  })

  const mappedInvites = invites.map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role as UserRole,
    roleLabel: formatRole(invite.role as UserRole),
    expiresAt: invite.expires_at,
    createdAt: invite.created_at,
    isExpired: new Date(invite.expires_at) < new Date(),
  }))

  return { members: mappedMembers, pendingInvites: mappedInvites }
}
