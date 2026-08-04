import type { Repositories } from '@/lib/repositories/factory'
import { slugify } from '@/modules/core/utils/format'
import {
  buildInviteUrl,
  generateInviteToken,
  getInviteExpiryDate,
  hashInviteToken,
} from '@/modules/core/services/invites'
import { isAssignableTeamRole } from '@/modules/core/services/roles'
import { getPermissionsForRole } from '@/modules/core/services/permissions'
import type { MemberStatus, UserRole } from '@/modules/core/types/enums'
import { ORGANIZATION_EVENT_TYPES } from '@/modules/organization/types'
import type {
  BusinessHoursSchedule,
  OrganizationAuditEntry,
  OrganizationDepartment,
  OrganizationInvite,
  OrganizationMember,
  OrganizationSubscriptionReference,
  OrganizationSummary,
  OrganizationTeam,
} from '@/modules/organization/types'
import type { PaginatedResult } from '@/lib/repositories/base/types'
import type { OrganizationBranding } from '@/modules/organization/types'

export class OrganizationService {
  constructor(private readonly repos: Repositories) {}

  async getOrganization(tenantId: string): Promise<OrganizationSummary | null> {
    return this.repos.organization.findById(tenantId)
  }

  async updateOrganization(
    tenantId: string,
    actorId: string,
    patch: {
      name?: string
      timezone?: string
      currency?: string
      subscription_reference?: string | null
    }
  ): Promise<{ ok: true; organization: OrganizationSummary } | { ok: false; error: string }> {
    const current = await this.repos.organization.findById(tenantId)
    if (!current) return { ok: false, error: 'Organization not found' }

    const organization = await this.repos.organization.update(tenantId, patch)
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'organization.updated',
      entityType: 'organization',
      entityId: tenantId,
      eventType: ORGANIZATION_EVENT_TYPES.UPDATED,
      beforeState: {
        name: current.name,
        timezone: current.settings.timezone,
        currency: current.settings.currency,
        subscriptionReference: current.subscriptionReference,
      },
      afterState: {
        name: organization.name,
        timezone: organization.settings.timezone,
        currency: organization.settings.currency,
        subscriptionReference: organization.subscriptionReference,
      },
    })

    return { ok: true, organization }
  }

  async updateBranding(
    tenantId: string,
    actorId: string,
    branding: Partial<{ logo_url: string | null; primary_color: string | null; accent_color: string | null }>
  ): Promise<{ ok: true; branding: OrganizationBranding } | { ok: false; error: string }> {
    const current = await this.repos.organization.findById(tenantId)
    if (!current) return { ok: false, error: 'Organization not found' }

    const updated = await this.repos.organization.updateBranding(tenantId, branding)
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'organization.branding.updated',
      entityType: 'organization',
      entityId: tenantId,
      eventType: ORGANIZATION_EVENT_TYPES.BRANDING_UPDATED,
      beforeState: current.branding as unknown as Record<string, unknown>,
      afterState: updated as unknown as Record<string, unknown>,
    })

    return { ok: true, branding: updated }
  }

  async updateBusinessHours(
    tenantId: string,
    actorId: string,
    businessHours: BusinessHoursSchedule
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const current = await this.repos.organization.findById(tenantId)
    if (!current) return { ok: false, error: 'Organization not found' }

    await this.repos.organization.updateBusinessHours(tenantId, businessHours)
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'organization.business_hours.updated',
      entityType: 'organization',
      entityId: tenantId,
      eventType: ORGANIZATION_EVENT_TYPES.UPDATED,
      beforeState: { businessHours: current.settings.businessHours },
      afterState: { businessHours },
    })

    return { ok: true }
  }

  async getSubscriptionReference(tenantId: string): Promise<OrganizationSubscriptionReference> {
    return this.repos.organization.getSubscriptionReference(tenantId)
  }

  async listMembers(
    tenantId: string,
    options: { page?: number; limit?: number; q?: string; status?: string; role?: string }
  ): Promise<PaginatedResult<OrganizationMember>> {
    return this.repos.organizationMember.list(tenantId, options)
  }

  async getMember(
    tenantId: string,
    memberId: string
  ): Promise<OrganizationMember | null> {
    return this.repos.organizationMember.findById(memberId, tenantId)
  }

  async updateMember(
    tenantId: string,
    actorId: string,
    memberId: string,
    patch: { role?: UserRole; status?: MemberStatus },
    actorMemberId?: string
  ): Promise<{ ok: true; member: OrganizationMember } | { ok: false; error: string }> {
    const current = await this.repos.organizationMember.findById(memberId, tenantId)
    if (!current) return { ok: false, error: 'Member not found' }
    if (actorMemberId && actorMemberId === memberId) {
      return { ok: false, error: 'You cannot modify your own membership.' }
    }

    let member = current

    if (patch.role && patch.role !== current.role) {
      if (current.role === 'admin') {
        const remainingAdmins = await this.repos.organizationMember.countAdmins(tenantId, memberId)
        if (remainingAdmins === 0) {
          return { ok: false, error: 'Cannot remove the last admin.' }
        }
      }
      member = await this.repos.organizationMember.updateRole(memberId, tenantId, patch.role)
      await this.auditAndEmit({
        tenantId,
        actorId,
        action: 'organization.member.role_changed',
        entityType: 'member',
        entityId: memberId,
        eventType: ORGANIZATION_EVENT_TYPES.MEMBER_ROLE_CHANGED,
        beforeState: { role: current.role },
        afterState: { role: member.role },
      })
    }

    if (patch.status && patch.status !== current.status) {
      if (current.role === 'admin' && patch.status === 'suspended') {
        const remainingAdmins = await this.repos.organizationMember.countAdmins(tenantId, memberId)
        if (remainingAdmins === 0) {
          return { ok: false, error: 'Cannot suspend the last admin.' }
        }
      }
      member = await this.repos.organizationMember.updateStatus(memberId, tenantId, patch.status)
      await this.auditAndEmit({
        tenantId,
        actorId,
        action: 'organization.member.suspended',
        entityType: 'member',
        entityId: memberId,
        eventType: ORGANIZATION_EVENT_TYPES.MEMBER_SUSPENDED,
        beforeState: { status: current.status },
        afterState: { status: member.status },
      })
    }

    return { ok: true, member }
  }

  async removeMember(
    tenantId: string,
    actorId: string,
    memberId: string,
    actorMemberId?: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const current = await this.repos.organizationMember.findById(memberId, tenantId)
    if (!current) return { ok: false, error: 'Member not found' }
    if (actorMemberId && actorMemberId === memberId) {
      return { ok: false, error: 'You cannot remove yourself.' }
    }
    if (current.role === 'admin') {
      const remainingAdmins = await this.repos.organizationMember.countAdmins(tenantId, memberId)
      if (remainingAdmins === 0) {
        return { ok: false, error: 'Cannot remove the last admin.' }
      }
    }

    await this.repos.organizationMember.softDelete(memberId, tenantId)
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'organization.member.removed',
      entityType: 'member',
      entityId: memberId,
      eventType: ORGANIZATION_EVENT_TYPES.MEMBER_REMOVED,
      beforeState: { email: current.email, role: current.role, status: current.status },
      afterState: { deleted: true },
    })

    return { ok: true }
  }

  async listInvites(
    tenantId: string,
    options: { page?: number; limit?: number; q?: string }
  ): Promise<PaginatedResult<OrganizationInvite>> {
    return this.repos.organizationInvite.list(tenantId, options)
  }

  async createInvite(
    tenantId: string,
    actorId: string,
    input: { email: string; role: UserRole; companyId?: string }
  ): Promise<
    | { ok: true; invite: OrganizationInvite; inviteUrl: string }
    | { ok: false; error: string }
  > {
    if (!isAssignableTeamRole(input.role)) {
      return { ok: false, error: 'Invalid invite role.' }
    }
    if (input.role === 'client' && !input.companyId) {
      return { ok: false, error: 'Select a company for client invites.' }
    }

    const email = input.email.trim().toLowerCase()
    if (!email) return { ok: false, error: 'Email is required.' }

    const token = generateInviteToken()
    const expiresAt = getInviteExpiryDate().toISOString()
    const { id } = await this.repos.organizationInvite.create({
      tenant_id: tenantId,
      email,
      role: input.role,
      invited_by: actorId,
      token_hash: hashInviteToken(token),
      expires_at: expiresAt,
      company_id: input.role === 'client' ? input.companyId ?? null : null,
    })

    const invite: OrganizationInvite = {
      id,
      email,
      role: input.role,
      expiresAt,
      createdAt: new Date().toISOString(),
      isExpired: false,
    }

    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'organization.member.invited',
      entityType: 'invite',
      entityId: id,
      eventType: ORGANIZATION_EVENT_TYPES.MEMBER_INVITED,
      afterState: { email, role: input.role },
    })

    return { ok: true, invite, inviteUrl: buildInviteUrl(token) }
  }

  async revokeInvite(
    tenantId: string,
    actorId: string,
    inviteId: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const invite = await this.repos.organizationInvite.findById(inviteId, tenantId)
    if (!invite) return { ok: false, error: 'Invite not found' }

    await this.repos.organizationInvite.revoke(inviteId, actorId)

    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'organization.invite.revoked',
      entityType: 'invite',
      entityId: inviteId,
      eventType: ORGANIZATION_EVENT_TYPES.INVITE_REVOKED,
      beforeState: { email: invite.email, role: invite.role },
    })

    return { ok: true }
  }

  async listDepartments(
    tenantId: string,
    options: { page?: number; limit?: number; q?: string }
  ): Promise<PaginatedResult<OrganizationDepartment>> {
    return this.repos.organizationDepartment.list(tenantId, options)
  }

  async getDepartment(
    tenantId: string,
    departmentId: string
  ): Promise<OrganizationDepartment | null> {
    return this.repos.organizationDepartment.findById(departmentId, tenantId)
  }

  async createDepartment(
    tenantId: string,
    actorId: string,
    input: { name: string; slug?: string; description?: string | null }
  ): Promise<{ ok: true; department: OrganizationDepartment } | { ok: false; error: string }> {
    const slug = input.slug ?? slugify(input.name)
    const department = await this.repos.organizationDepartment.create({
      tenant_id: tenantId,
      name: input.name,
      slug,
      description: input.description ?? null,
    })

    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'organization.department.created',
      entityType: 'department',
      entityId: department.id,
      eventType: ORGANIZATION_EVENT_TYPES.DEPARTMENT_CREATED,
      afterState: { name: department.name, slug: department.slug },
    })

    return { ok: true, department }
  }

  async updateDepartment(
    tenantId: string,
    actorId: string,
    departmentId: string,
    patch: { name?: string; description?: string | null }
  ): Promise<{ ok: true; department: OrganizationDepartment } | { ok: false; error: string }> {
    const current = await this.repos.organizationDepartment.findById(departmentId, tenantId)
    if (!current) return { ok: false, error: 'Department not found' }

    const department = await this.repos.organizationDepartment.update(departmentId, tenantId, patch)
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'organization.department.updated',
      entityType: 'department',
      entityId: departmentId,
      eventType: ORGANIZATION_EVENT_TYPES.DEPARTMENT_UPDATED,
      beforeState: { name: current.name, description: current.description },
      afterState: { name: department.name, description: department.description },
    })

    return { ok: true, department }
  }

  async deleteDepartment(
    tenantId: string,
    actorId: string,
    departmentId: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const current = await this.repos.organizationDepartment.findById(departmentId, tenantId)
    if (!current) return { ok: false, error: 'Department not found' }

    await this.repos.organizationDepartment.softDelete(departmentId, tenantId)
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'organization.department.deleted',
      entityType: 'department',
      entityId: departmentId,
      eventType: ORGANIZATION_EVENT_TYPES.DEPARTMENT_DELETED,
      beforeState: { name: current.name },
    })

    return { ok: true }
  }

  async listTeams(
    tenantId: string,
    options: { page?: number; limit?: number; q?: string; departmentId?: string }
  ): Promise<PaginatedResult<OrganizationTeam>> {
    return this.repos.organizationTeam.list(tenantId, options)
  }

  async getTeam(tenantId: string, teamId: string): Promise<OrganizationTeam | null> {
    return this.repos.organizationTeam.findById(teamId, tenantId)
  }

  async createTeam(
    tenantId: string,
    actorId: string,
    input: { name: string; slug?: string; description?: string | null; department_id?: string | null }
  ): Promise<{ ok: true; team: OrganizationTeam } | { ok: false; error: string }> {
    if (input.department_id) {
      const dept = await this.repos.organizationDepartment.findById(input.department_id, tenantId)
      if (!dept) return { ok: false, error: 'Department not found' }
    }

    const slug = input.slug ?? slugify(input.name)
    const team = await this.repos.organizationTeam.create({
      tenant_id: tenantId,
      name: input.name,
      slug,
      description: input.description ?? null,
      department_id: input.department_id ?? null,
    })

    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'organization.team.created',
      entityType: 'team',
      entityId: team.id,
      eventType: ORGANIZATION_EVENT_TYPES.TEAM_CREATED,
      afterState: { name: team.name, slug: team.slug },
    })

    return { ok: true, team }
  }

  async updateTeam(
    tenantId: string,
    actorId: string,
    teamId: string,
    patch: { name?: string; description?: string | null; department_id?: string | null }
  ): Promise<{ ok: true; team: OrganizationTeam } | { ok: false; error: string }> {
    const current = await this.repos.organizationTeam.findById(teamId, tenantId)
    if (!current) return { ok: false, error: 'Team not found' }

    if (patch.department_id) {
      const dept = await this.repos.organizationDepartment.findById(patch.department_id, tenantId)
      if (!dept) return { ok: false, error: 'Department not found' }
    }

    const team = await this.repos.organizationTeam.update(teamId, tenantId, patch)
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'organization.team.updated',
      entityType: 'team',
      entityId: teamId,
      eventType: ORGANIZATION_EVENT_TYPES.TEAM_UPDATED,
      beforeState: { name: current.name, departmentId: current.departmentId },
      afterState: { name: team.name, departmentId: team.departmentId },
    })

    return { ok: true, team }
  }

  async deleteTeam(
    tenantId: string,
    actorId: string,
    teamId: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const current = await this.repos.organizationTeam.findById(teamId, tenantId)
    if (!current) return { ok: false, error: 'Team not found' }

    await this.repos.organizationTeam.softDelete(teamId, tenantId)
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'organization.team.deleted',
      entityType: 'team',
      entityId: teamId,
      eventType: ORGANIZATION_EVENT_TYPES.TEAM_DELETED,
      beforeState: { name: current.name },
    })

    return { ok: true }
  }

  async addTeamMember(
    tenantId: string,
    actorId: string,
    teamId: string,
    memberId: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const team = await this.repos.organizationTeam.findById(teamId, tenantId)
    if (!team) return { ok: false, error: 'Team not found' }

    const member = await this.repos.organizationMember.findById(memberId, tenantId)
    if (!member) return { ok: false, error: 'Member not found' }

    await this.repos.organizationTeam.addMember(teamId, tenantId, memberId)
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'organization.team.member_added',
      entityType: 'team',
      entityId: teamId,
      eventType: ORGANIZATION_EVENT_TYPES.TEAM_UPDATED,
      afterState: { memberId },
    })

    return { ok: true }
  }

  async removeTeamMember(
    tenantId: string,
    actorId: string,
    teamId: string,
    memberId: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    await this.repos.organizationTeam.removeMember(teamId, tenantId, memberId)
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'organization.team.member_removed',
      entityType: 'team',
      entityId: teamId,
      eventType: ORGANIZATION_EVENT_TYPES.TEAM_UPDATED,
      afterState: { memberId, removed: true },
    })

    return { ok: true }
  }

  async listTeamMembers(tenantId: string, teamId: string): Promise<string[]> {
    return this.repos.organizationTeam.listMemberIds(teamId, tenantId)
  }

  async listAuditLogs(
    tenantId: string,
    options: { page?: number; limit?: number; action?: string; entityType?: string }
  ): Promise<PaginatedResult<OrganizationAuditEntry>> {
    return this.repos.organizationAudit.list(tenantId, options)
  }

  getRolePermissions(role: UserRole) {
    return getPermissionsForRole(role)
  }

  getAllRolePermissions() {
    const roles: UserRole[] = ['admin', 'talent_manager', 'freelancer', 'client']
    return Object.fromEntries(roles.map((role) => [role, getPermissionsForRole(role)]))
  }

  private async auditAndEmit(input: {
    tenantId: string
    actorId: string
    action: string
    entityType: string
    entityId: string
    eventType: string
    beforeState?: Record<string, unknown> | null
    afterState?: Record<string, unknown> | null
  }) {
    await this.repos.organizationAudit.record({
      tenant_id: input.tenantId,
      actor_id: input.actorId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      before_state: input.beforeState ?? null,
      after_state: input.afterState ?? null,
    })

    await this.repos.domainEvent.emit({
      tenantId: input.tenantId,
      eventType: input.eventType,
      aggregateType: input.entityType,
      aggregateId: input.entityId,
      idempotencyKey: `${input.eventType}:${input.entityId}:${Date.now()}`,
      payload: {
        action: input.action,
        before: input.beforeState ?? null,
        after: input.afterState ?? null,
      },
      actorId: input.actorId,
    })
  }
}
