import { createClient } from '@/lib/supabase/server'
import type { SessionContext, TenantContext } from '@/types/enums'

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

  const tenant = await getActiveTenant(user.id)

  return {
    user: {
      id: user.id,
      email: profile?.email ?? user.email ?? '',
      fullName: profile?.full_name ?? null,
    },
    tenant,
  }
}

export async function getActiveTenant(userId: string): Promise<TenantContext | null> {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from('tenant_members')
    .select('role, tenant_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!membership) return null

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, slug, name, timezone, currency')
    .eq('id', membership.tenant_id)
    .maybeSingle()

  if (!tenant) return null

  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    role: membership.role as TenantContext['role'],
    timezone: tenant.timezone,
    currency: tenant.currency,
  }
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
