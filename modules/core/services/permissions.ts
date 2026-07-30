import type { UserRole } from '@/modules/core/types/enums'

const PERMISSION_MAP: Record<UserRole, string[]> = {
  admin: [
    'tenant:read',
    'tenant:update',
    'tenant:billing',
    'members:invite',
    'members:manage',
    'integrations:manage',
    'freelancers:create',
    'freelancers:read',
    'freelancers:update',
    'freelancers:delete',
    'freelancers:rate',
    'opportunities:create',
    'opportunities:read',
    'opportunities:broadcast',
    'ai:match',
    'ai:brief_parse',
    'ai:summary',
    'ai:status',
    'shortlists:manage',
    'projects:create',
    'projects:read',
    'projects:update',
    'milestones:review',
    'payments:read',
    'payments:approve',
    'payments:pay',
    'analytics:read',
    'companies:create',
    'companies:read',
    'companies:update',
  ],
  talent_manager: [
    'tenant:read',
    'freelancers:create',
    'freelancers:read',
    'freelancers:update',
    'freelancers:delete',
    'freelancers:rate',
    'opportunities:create',
    'opportunities:read',
    'opportunities:broadcast',
    'ai:match',
    'ai:brief_parse',
    'ai:summary',
    'ai:status',
    'shortlists:manage',
    'projects:create',
    'projects:read',
    'projects:update',
    'milestones:review',
    'payments:read',
    'analytics:read',
    'companies:read',
  ],
  freelancer: [
    'tenant:read',
    'freelancers:read',
    'freelancers:update',
    'opportunities:read',
    'opportunities:respond',
    'projects:read',
    'projects:update',
    'milestones:submit',
    'payments:read',
  ],
  client: [
    'tenant:read',
    'companies:read',
    'projects:read',
    'opportunities:read',
  ],
}

export function hasPermission(role: UserRole, permission: string) {
  return PERMISSION_MAP[role]?.includes(permission) ?? false
}

export function getPermissionsForRole(role: UserRole): string[] {
  return PERMISSION_MAP[role] ?? []
}

export function requirePermission(role: UserRole, permission: string) {
  if (!hasPermission(role, permission)) {
    throw new Error(`FORBIDDEN: missing permission ${permission}`)
  }
}

export function isManager(role: UserRole) {
  return role === 'admin' || role === 'talent_manager'
}

export function isTalentRole(role: UserRole) {
  return role === 'freelancer'
}

export function isClientRole(role: UserRole) {
  return role === 'client'
}

export function isAdmin(role: UserRole) {
  return role === 'admin'
}
