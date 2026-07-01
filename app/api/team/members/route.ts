import { requireAdmin } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { success, handleApiError } from '@/lib/api/response'
import { formatRole } from '@/lib/auth/roles'
import type { UserRole } from '@/types/enums'

export async function GET() {
  try {
    const { tenant } = await requireAdmin()
    const supabase = await createClient()

    const { data: members, error: membersError } = await supabase
      .from('tenant_members')
      .select(
        `
        id,
        role,
        status,
        joined_at,
        profiles (
          id,
          email,
          full_name
        )
      `
      )
      .eq('tenant_id', tenant.id)
      .order('joined_at', { ascending: true })

    if (membersError) throw membersError

    const { data: invites, error: invitesError } = await supabase
      .from('member_invites')
      .select('id, email, role, expires_at, created_at, accepted_at, revoked_at')
      .eq('tenant_id', tenant.id)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })

    if (invitesError) throw invitesError

    const mappedMembers = (members ?? []).map((member) => {
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

    const mappedInvites = (invites ?? []).map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role as UserRole,
      roleLabel: formatRole(invite.role as UserRole),
      expiresAt: invite.expires_at,
      createdAt: invite.created_at,
      isExpired: new Date(invite.expires_at) < new Date(),
    }))

    return success({
      members: mappedMembers,
      pendingInvites: mappedInvites,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
