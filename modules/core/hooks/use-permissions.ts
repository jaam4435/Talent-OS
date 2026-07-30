'use client'

import type { UserRole } from '@/modules/core/types/enums'
import { hasPermission, isAdmin, isManager } from '@/modules/core/services/permissions'

export function usePermissions(role: UserRole | undefined) {
  return {
    can: (permission: string) => (role ? hasPermission(role, permission) : false),
    isManager: role ? isManager(role) : false,
    isAdmin: role ? isAdmin(role) : false,
  }
}
