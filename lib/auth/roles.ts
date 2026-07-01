import type { UserRole } from '@/types/enums'

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  talent_manager: 'Talent Manager',
  freelancer: 'Freelancer',
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Full workspace access including billing, team, and integrations.',
  talent_manager: 'Manage talent, opportunities, projects, and analytics.',
  freelancer: 'View assigned opportunities and projects; submit deliverables.',
}

export function formatRole(role: UserRole): string {
  return ROLE_LABELS[role] ?? role
}

export function isAssignableTeamRole(role: string): role is 'talent_manager' | 'freelancer' {
  return role === 'talent_manager' || role === 'freelancer'
}
