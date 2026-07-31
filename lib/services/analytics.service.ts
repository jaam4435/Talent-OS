import type { Repositories } from '@/lib/repositories/factory'
import type { DashboardSummary } from '@/lib/repositories/dashboard.repository'
import { formatRole } from '@/modules/core/services/roles'
import type { UserRole } from '@/modules/core/types/enums'

export class AnalyticsService {
  constructor(private readonly repos: Repositories) {}

  async getManagerDashboard(tenantId: string): Promise<{
    summary: DashboardSummary | null
    companyCount: number
  }> {
    const [summary, companyCount] = await Promise.all([
      this.repos.dashboard.getSummary(tenantId),
      this.repos.company.countByTenant(tenantId),
    ])
    return { summary, companyCount }
  }

  async getClientDashboardContext(userId: string, tenantId: string) {
    const companyId = await this.repos.tenantMember.findCompanyId(userId, tenantId)
    const company = companyId ? await this.repos.company.findById(companyId, tenantId) : null
    return { companyId, companyName: company?.name ?? null }
  }

  async getFreelancerDashboardContext(userId: string, tenantId: string) {
    const freelancerId = await this.repos.talent.findIdByUserId(userId, tenantId)
    return { freelancerId }
  }

  async getDashboardSummary(tenantId: string): Promise<DashboardSummary | null> {
    return this.repos.dashboard.getSummary(tenantId)
  }

  async getTeamMembersPageData(tenantId: string) {
    const [members, invites] = await Promise.all([
      this.repos.tenantMember.listWithProfiles(tenantId),
      this.repos.memberInvite.listPending(tenantId),
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
}
