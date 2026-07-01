'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils/format'
import { requireAdmin } from '@/lib/auth/guards'
import {
  buildInviteUrl,
  generateInviteToken,
  getInviteExpiryDate,
  hashInviteToken,
} from '@/lib/auth/invites'
import { ACTIVE_TENANT_COOKIE } from '@/lib/auth/tenant-context'
import { isAssignableTeamRole } from '@/lib/auth/roles'
import type { UserRole } from '@/types/enums'

export async function signUpAgency(input: {
  email: string
  password: string
  agencyName: string
}) {
  const supabase = await createClient()

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { full_name: input.agencyName },
    },
  })

  if (authError) {
    return { success: false as const, error: authError.message }
  }

  if (!authData.user) {
    return { success: false as const, error: 'Failed to create user' }
  }

  const slug = slugify(input.agencyName)
  const { data: tenantId, error: tenantError } = await supabase.rpc(
    'create_tenant_with_admin',
    {
      p_name: input.agencyName,
      p_slug: slug,
      p_user_id: authData.user.id,
    }
  )

  if (tenantError) {
    return { success: false as const, error: tenantError.message }
  }

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_TENANT_COOKIE, tenantId as string, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })

  return { success: true as const, tenantId: tenantId as string, slug }
}

export async function signInWithPassword(input: { email: string; password: string }) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  })

  if (error) {
    return { success: false as const, error: error.message }
  }

  return { success: true as const }
}

export async function sendMagicLink(email: string, redirectTo?: string) {
  const supabase = await createClient()
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const next = redirectTo ?? '/dashboard'

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${base}/api/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })

  if (error) {
    return { success: false as const, error: error.message }
  }

  return { success: true as const }
}

export async function requestPasswordReset(email: string) {
  const supabase = await createClient()
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${base}/api/auth/callback?next=/dashboard`,
  })

  if (error) {
    return { success: false as const, error: error.message }
  }

  return { success: true as const }
}

export async function inviteTeamMember(input: { email: string; role: UserRole }) {
  const { tenant, user } = await requireAdmin()

  if (!isAssignableTeamRole(input.role)) {
    return { success: false as const, error: 'Only talent_manager or freelancer roles can be invited.' }
  }

  const email = input.email.trim().toLowerCase()
  if (!email) {
    return { success: false as const, error: 'Email is required.' }
  }

  const token = generateInviteToken()
  const tokenHash = hashInviteToken(token)
  const expiresAt = getInviteExpiryDate().toISOString()

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('member_invites')
    .insert({
      tenant_id: tenant.id,
      email,
      role: input.role,
      invited_by: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false as const, error: 'An invite already exists for this email.' }
    }
    return { success: false as const, error: error.message }
  }

  revalidatePath('/settings/team')

  return {
    success: true as const,
    inviteId: data.id as string,
    inviteUrl: buildInviteUrl(token),
    expiresAt,
  }
}

export async function revokeTeamInvite(inviteId: string) {
  const { user } = await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.rpc('revoke_member_invite', {
    p_invite_id: inviteId,
    p_actor_id: user.id,
  })

  if (error) {
    return { success: false as const, error: error.message }
  }

  revalidatePath('/settings/team')
  return { success: true as const }
}

export async function acceptInvite(input: {
  token: string
  password?: string
  fullName?: string
}) {
  const tokenHash = hashInviteToken(input.token)
  const supabase = await createClient()

  const { data: previewRows, error: previewError } = await supabase.rpc(
    'get_invite_preview',
    { p_token_hash: tokenHash }
  )

  const preview = Array.isArray(previewRows) ? previewRows[0] : previewRows
  if (previewError || !preview?.is_valid) {
    return { success: false as const, error: 'This invitation is invalid or has expired.' }
  }

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  let userId: string

  if (!currentUser) {
    if (!input.password) {
      return {
        success: false as const,
        error: 'PASSWORD_REQUIRED',
        email: preview.email as string,
      }
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: preview.email as string,
      password: input.password,
      options: {
        data: { full_name: input.fullName ?? '' },
      },
    })

    if (signUpError) {
      return { success: false as const, error: signUpError.message }
    }

    const {
      data: { user: newUser },
    } = await supabase.auth.getUser()

    if (!newUser) {
      return {
        success: false as const,
        error: 'Account created but session not established. Please sign in.',
      }
    }

    userId = newUser.id
  } else {
    if (currentUser.email?.toLowerCase() !== (preview.email as string).toLowerCase()) {
      return {
        success: false as const,
        error: `Sign in as ${preview.email} to accept this invitation.`,
      }
    }
    userId = currentUser.id
  }

  const { data: tenantId, error: acceptError } = await supabase.rpc('accept_member_invite', {
    p_token_hash: tokenHash,
    p_user_id: userId,
  })

  if (acceptError) {
    return { success: false as const, error: acceptError.message }
  }

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_TENANT_COOKIE, tenantId as string, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })

  return { success: true as const, tenantId: tenantId as string }
}

export async function switchActiveTenant(tenantId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false as const, error: 'UNAUTHORIZED' }
  }

  const { data: membership } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .maybeSingle()

  if (!membership) {
    return { success: false as const, error: 'FORBIDDEN' }
  }

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })

  return { success: true as const }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const cookieStore = await cookies()
  cookieStore.delete(ACTIVE_TENANT_COOKIE)
}
