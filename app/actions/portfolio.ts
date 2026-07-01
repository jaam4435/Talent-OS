'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/auth/session'
import { isManager } from '@/lib/auth/permissions'
import { portfolioItemSchema } from '@/lib/talent/validation'
import type { PortfolioItemInput } from '@/lib/talent/types'

async function assertPortfolioAccess(freelancerId: string) {
  const { tenant, user } = await requireTenant()
  const supabase = await createClient()

  if (isManager(tenant.role)) {
    const { data } = await supabase
      .from('freelancers')
      .select('id')
      .eq('id', freelancerId)
      .eq('tenant_id', tenant.id)
      .maybeSingle()
    if (!data) throw new Error('FORBIDDEN')
    return { tenantId: tenant.id }
  }

  const { data } = await supabase
    .from('freelancers')
    .select('id, tenant_id')
    .eq('id', freelancerId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data) throw new Error('FORBIDDEN')
  return { tenantId: data.tenant_id as string }
}

export async function addPortfolioItem(freelancerId: string, input: PortfolioItemInput) {
  try {
    await assertPortfolioAccess(freelancerId)
  } catch {
    return { ok: false as const, error: 'FORBIDDEN' }
  }

  const parsed = portfolioItemSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('freelancer_portfolio_items')
    .insert({
      freelancer_id: freelancerId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      project_url: parsed.data.projectUrl || null,
      image_path: parsed.data.imagePath ?? null,
      sort_order: parsed.data.sortOrder ?? 0,
    })
    .select('id')
    .single()

  if (error) {
    return { ok: false as const, error: error.message }
  }

  revalidatePath(`/talent/${freelancerId}`)
  revalidatePath('/profile')
  return { ok: true as const, itemId: data.id as string }
}

export async function deletePortfolioItem(freelancerId: string, itemId: string) {
  try {
    await assertPortfolioAccess(freelancerId)
  } catch {
    return { ok: false as const, error: 'FORBIDDEN' }
  }

  const supabase = await createClient()

  const { data: item } = await supabase
    .from('freelancer_portfolio_items')
    .select('image_path')
    .eq('id', itemId)
    .eq('freelancer_id', freelancerId)
    .maybeSingle()

  if (item?.image_path) {
    await supabase.storage.from('portfolio').remove([item.image_path])
  }

  const { error } = await supabase
    .from('freelancer_portfolio_items')
    .delete()
    .eq('id', itemId)
    .eq('freelancer_id', freelancerId)

  if (error) {
    return { ok: false as const, error: error.message }
  }

  revalidatePath(`/talent/${freelancerId}`)
  revalidatePath('/profile')
  return { ok: true as const }
}

export async function uploadPortfolioImage(freelancerId: string, formData: FormData) {
  try {
    await assertPortfolioAccess(freelancerId)
  } catch {
    return { ok: false as const, error: 'FORBIDDEN' }
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return { ok: false as const, error: 'No file provided' }
  }

  if (file.size > 10 * 1024 * 1024) {
    return { ok: false as const, error: 'File must be under 10MB' }
  }

  const { tenant } = await requireTenant()
  const supabase = await createClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${tenant?.id ?? 'unknown'}/${freelancerId}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from('portfolio').upload(path, file, {
    upsert: false,
    contentType: file.type,
  })

  if (error) {
    return { ok: false as const, error: error.message }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('portfolio').getPublicUrl(path)

  return { ok: true as const, path, publicUrl }
}
