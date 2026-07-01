export type UserRole = 'admin' | 'talent_manager' | 'freelancer'

export type MemberStatus = 'invited' | 'active' | 'suspended'

export type DisciplineType =
  | 'design'
  | 'video'
  | 'copy'
  | 'motion'
  | 'brand'
  | 'other'

export type AvailabilityStatus = 'available' | 'busy' | 'unavailable'

export type OpportunityStatus =
  | 'draft'
  | 'open'
  | 'closed'
  | 'filled'
  | 'canceled'

export type ProjectStatus =
  | 'draft'
  | 'active'
  | 'in_review'
  | 'completed'
  | 'archived'
  | 'canceled'

export type PaymentStatus =
  | 'pending'
  | 'approved'
  | 'processing'
  | 'paid'
  | 'disputed'
  | 'canceled'

export type MilestoneStatus =
  | 'pending'
  | 'in_progress'
  | 'submitted'
  | 'approved'
  | 'revision'
  | 'canceled'

export interface TenantContext {
  id: string
  slug: string
  name: string
  role: UserRole
  timezone: string
  currency: string
}

export interface SessionUser {
  id: string
  email: string
  fullName: string | null
}

export interface SessionContext {
  user: SessionUser
  tenant: TenantContext | null
  permissions: string[]
}
