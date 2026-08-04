import type { UserRole, MemberStatus } from '@/modules/core/types/enums'

export interface BusinessHoursDay {
  open: string | null
  close: string | null
  closed: boolean
}

export interface BusinessHoursSchedule {
  monday: BusinessHoursDay
  tuesday: BusinessHoursDay
  wednesday: BusinessHoursDay
  thursday: BusinessHoursDay
  friday: BusinessHoursDay
  saturday: BusinessHoursDay
  sunday: BusinessHoursDay
}

export interface OrganizationBranding {
  logoUrl: string | null
  primaryColor: string | null
  accentColor: string | null
}

export interface OrganizationSettings {
  timezone: string
  currency: string
  businessHours: BusinessHoursSchedule
  settings: Record<string, unknown>
}

export interface OrganizationSummary {
  id: string
  name: string
  slug: string
  subscriptionStatus: string
  subscriptionReference: string | null
  trialEndsAt: string | null
  branding: OrganizationBranding
  settings: OrganizationSettings
  createdAt: string
  updatedAt: string
}

export interface OrganizationMember {
  id: string
  userId: string
  email: string
  fullName: string | null
  role: UserRole
  status: MemberStatus
  joinedAt: string | null
  invitedAt: string | null
}

export interface OrganizationInvite {
  id: string
  email: string
  role: UserRole
  expiresAt: string
  createdAt: string
  isExpired: boolean
}

export interface OrganizationDepartment {
  id: string
  name: string
  slug: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface OrganizationTeam {
  id: string
  name: string
  slug: string
  description: string | null
  departmentId: string | null
  memberCount: number
  createdAt: string
  updatedAt: string
}

export interface OrganizationAuditEntry {
  id: string
  action: string
  entityType: string
  entityId: string
  actorId: string | null
  beforeState: Record<string, unknown> | null
  afterState: Record<string, unknown> | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface OrganizationSubscriptionReference {
  status: string
  reference: string | null
  trialEndsAt: string | null
  tier: string | null
}

export const ORGANIZATION_EVENT_TYPES = {
  UPDATED: 'organization.updated',
  BRANDING_UPDATED: 'organization.branding.updated',
  MEMBER_INVITED: 'organization.member.invited',
  MEMBER_ROLE_CHANGED: 'organization.member.role_changed',
  MEMBER_SUSPENDED: 'organization.member.suspended',
  MEMBER_REMOVED: 'organization.member.removed',
  INVITE_REVOKED: 'organization.invite.revoked',
  DEPARTMENT_CREATED: 'organization.department.created',
  DEPARTMENT_UPDATED: 'organization.department.updated',
  DEPARTMENT_DELETED: 'organization.department.deleted',
  TEAM_CREATED: 'organization.team.created',
  TEAM_UPDATED: 'organization.team.updated',
  TEAM_DELETED: 'organization.team.deleted',
} as const
