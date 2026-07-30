import { cookies } from 'next/headers'
import { createClient } from '@/modules/core/utils/supabase/server'
import type { TenantContext, UserRole } from '@/modules/core/types/enums'

export const ACTIVE_TENANT_COOKIE = 'active-tenant-id'

export async function getUserMemberships(userId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('tenant_members')
    .select(
      `
      role,
      status,
      tenant_id,
      tenants (
        id,
        slug,
        name,
        timezone,
        currency
      )
    `
    )
    .eq('user_id', userId)
    .eq('status', 'active')

  return (data ?? [])
    .map((row) => {
      const tenant = Array.isArray(row.tenants) ? row.tenants[0] : row.tenants
      if (!tenant) return null

      return {
        id: tenant.id as string,
        slug: tenant.slug as string,
        name: tenant.name as string,
        role: row.role as UserRole,
        timezone: tenant.timezone as string,
        currency: tenant.currency as string,
      } satisfies TenantContext
    })
    .filter((row): row is TenantContext => row !== null)
}

export async function resolveActiveTenant(userId: string): Promise<TenantContext | null> {
  const memberships = await getUserMemberships(userId)
  if (!memberships.length) return null

  const cookieStore = await cookies()
  const preferredTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value

  if (preferredTenantId) {
    const match = memberships.find((m) => m.id === preferredTenantId)
    if (match) return match
  }

  return memberships[0] ?? null
}
