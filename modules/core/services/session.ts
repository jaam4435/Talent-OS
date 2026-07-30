import { createClient } from '@/modules/core/utils/supabase/server'
import { getPermissionsForRole } from '@/modules/core/services/permissions'
import { resolveActiveTenant } from '@/modules/core/services/tenant-context'
import type { SessionContext, TenantContext } from '@/modules/core/types/enums'

export async function getSession(): Promise<SessionContext | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  const tenant = await resolveActiveTenant(user.id)

  return {
    user: {
      id: user.id,
      email: profile?.email ?? user.email ?? '',
      fullName: profile?.full_name ?? null,
    },
    tenant,
    permissions: tenant ? getPermissionsForRole(tenant.role) : [],
  }
}

export async function getActiveTenant(userId: string): Promise<TenantContext | null> {
  return resolveActiveTenant(userId)
}

export async function requireSession() {
  const session = await getSession()
  if (!session) {
    throw new Error('UNAUTHORIZED')
  }
  return session
}

export async function requireTenant() {
  const session = await requireSession()
  if (!session.tenant) {
    throw new Error('NO_TENANT')
  }
  return { ...session, tenant: session.tenant }
}
