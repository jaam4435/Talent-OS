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

  async getFillRate(tenantId: string, filters?: { fromDate?: string; toDate?: string; discipline?: string }) {
    const summary = await this.repos.dashboard.getSummary(tenantId)
    const leads = await this.repos.lead.listByTenant(tenantId, { limit: 100 })
    const items = leads.data
    const filtered = items.filter((o) => !filters?.discipline || true)
    const filled = filtered.filter((o) => o.status === 'filled' || o.status === 'closed').length
    return {
      total_opportunities: filtered.length,
      filled,
      fill_rate: filtered.length ? filled / filtered.length : 0,
      open_opportunities: summary?.open_opportunities ?? 0,
      active_projects: summary?.active_projects ?? 0,
    }
  }

  async getTalentUtilization(tenantId: string, filters?: { discipline?: string; minAssignments?: number }) {
    const roster = await this.repos.talent.listByTenant(tenantId, {
      discipline: filters?.discipline,
    })
    const filtered = roster.data
    return {
      total_talent: filtered.length,
      available: filtered.filter((f) => f.availability === 'available').length,
      busy: filtered.filter((f) => f.availability === 'busy').length,
      unavailable: filtered.filter((f) => f.availability === 'unavailable').length,
      min_assignments_filter: filters?.minAssignments ?? 0,
    }
  }

  async getPaymentAgingAnalytics(tenantId: string) {
    return this.repos.invoice.getAgingSummary(tenantId)
  }

  async getAiUsage(
    tenantId: string,
    filters?: { fromDate?: string; toDate?: string; feature?: string }
  ) {
    return this.repos.aiRequest.summarizeUsage(tenantId, {
      fromDate: filters?.fromDate,
      toDate: filters?.toDate,
      feature: filters?.feature,
    })
  }

  async getPipelineHealth(tenantId: string) {
    const leads = await this.repos.lead.listByTenant(tenantId, { limit: 100 })
    const opportunities = leads.data
    const open = opportunities.filter((o) => o.status === 'open').length
    return {
      open_opportunities: open,
      total_opportunities: opportunities.length,
      stale_opportunities: 0,
    }
  }
}
