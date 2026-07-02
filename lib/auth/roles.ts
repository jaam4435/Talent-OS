import type { CoreUserRole, UserRole } from '@/types/enums'

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  talent_manager: 'Talent Manager',
  freelancer: 'Talent',
  client: 'Client',
}

export const CORE_ROLE_LABELS: Record<CoreUserRole, string> = {
  admin: 'Admin',
  talent: 'Talent',
  client: 'Client',
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Full workspace access including billing, team, and integrations.',
  talent_manager: 'Manage talent, opportunities, projects, and analytics.',
  freelancer: 'View assigned opportunities and projects; submit deliverables.',
  client: 'View projects and opportunities for your company.',
}

/** Map database roles to simplified client / talent / admin model */
export function toCoreRole(role: UserRole): CoreUserRole {
  if (role === 'freelancer') return 'talent'
  if (role === 'client') return 'client'
  return 'admin'
}

export function formatRole(role: UserRole): string {
  return ROLE_LABELS[role] ?? role
}

export function formatCoreRole(role: CoreUserRole): string {
  return CORE_ROLE_LABELS[role] ?? role
}

export function isAssignableTeamRole(
  role: string
): role is 'talent_manager' | 'freelancer' | 'client' {
  return role === 'talent_manager' || role === 'freelancer' || role === 'client'
}

export function isTalent(role: UserRole): boolean {
  return role === 'freelancer'
}

export function isClient(role: UserRole): boolean {
  return role === 'client'
}

export function isStaff(role: UserRole): boolean {
  return role === 'admin' || role === 'talent_manager'
}
