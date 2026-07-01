import type { UserRole } from '@/types/enums'
import { requirePermission } from '@/lib/auth/permissions'
import { requireTenant } from '@/lib/auth/session'

export async function requireRole(...roles: UserRole[]) {
  const session = await requireTenant()
  if (!roles.includes(session.tenant.role)) {
    throw new Error('FORBIDDEN')
  }
  return session
}

export async function requireAdmin() {
  return requireRole('admin')
}

export async function requireManager() {
  return requireRole('admin', 'talent_manager')
}

export async function requirePermissionFor(permission: string) {
  const session = await requireTenant()
  requirePermission(session.tenant.role, permission)
  return session
}
