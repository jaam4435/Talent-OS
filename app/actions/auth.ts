'use server'

import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils/format'

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

  return { success: true as const, tenantId, slug }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
