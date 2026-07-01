'use client'

import type { UserRole } from '@/types/enums'
import { hasPermission, isAdmin, isManager } from '@/lib/auth/permissions'

export function usePermissions(role: UserRole | undefined) {
  return {
    can: (permission: string) => (role ? hasPermission(role, permission) : false),
    isManager: role ? isManager(role) : false,
    isAdmin: role ? isAdmin(role) : false,
  }
}
