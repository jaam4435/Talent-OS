import type { UserRole } from '@/modules/core/types/enums'
import { requirePermission } from '@/modules/core/services/permissions'
import { requireTenant } from '@/modules/core/services/session'

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
