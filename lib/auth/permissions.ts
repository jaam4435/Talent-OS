import type { UserRole } from '@/types/enums'

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
    'shortlists:manage',
    'projects:create',
    'projects:read',
    'projects:update',
    'milestones:review',
    'payments:read',
    'payments:approve',
    'payments:pay',
    'analytics:read',
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
    'shortlists:manage',
    'projects:create',
    'projects:read',
    'projects:update',
    'milestones:review',
    'payments:read',
    'analytics:read',
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
}

export function hasPermission(role: UserRole, permission: string) {
  return PERMISSION_MAP[role]?.includes(permission) ?? false
}

export function requirePermission(role: UserRole, permission: string) {
  if (!hasPermission(role, permission)) {
    throw new Error(`FORBIDDEN: missing permission ${permission}`)
  }
}

export function isManager(role: UserRole) {
  return role === 'admin' || role === 'talent_manager'
}

export function isAdmin(role: UserRole) {
  return role === 'admin'
}
