'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/auth/guards'
import { requireTenant } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { isManager } from '@/lib/auth/permissions'
import {
  freelancerProfileSchema,
  freelancerSelfProfileSchema,
} from '@/lib/talent/validation'
import type { FreelancerProfileInput, FreelancerSelfProfileInput } from '@/lib/talent/types'

export async function createFreelancer(input: FreelancerProfileInput) {
  const { tenant } = await requireManager()
  requirePermission(tenant.role, 'freelancers:create')

  const parsed = freelancerProfileSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('freelancers')
    .insert({
      tenant_id: tenant.id,
      full_name: parsed.data.fullName,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone ?? null,
      discipline: parsed.data.discipline,
      skills: parsed.data.skills,
      tags: parsed.data.tags ?? [],
      day_rate: parsed.data.dayRate ?? null,
      currency: parsed.data.currency ?? tenant.currency,
      bio: parsed.data.bio ?? null,
      portfolio_url: parsed.data.portfolioUrl || null,
      availability: parsed.data.availability ?? 'available',
      internal_rating: parsed.data.internalRating ?? null,
      internal_notes: parsed.data.internalNotes ?? null,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { ok: false as const, error: 'A freelancer with this email already exists.' }
    }
    return { ok: false as const, error: error.message }
  }

  revalidatePath('/talent')
  return { ok: true as const, freelancerId: data.id as string }
}

export async function updateFreelancer(freelancerId: string, input: FreelancerProfileInput) {
  const { tenant } = await requireManager()
  requirePermission(tenant.role, 'freelancers:update')

  const parsed = freelancerProfileSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('freelancers')
    .update({
      full_name: parsed.data.fullName,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone ?? null,
      discipline: parsed.data.discipline,
      skills: parsed.data.skills,
      tags: parsed.data.tags ?? [],
      day_rate: parsed.data.dayRate ?? null,
      currency: parsed.data.currency ?? tenant.currency,
      bio: parsed.data.bio ?? null,
      portfolio_url: parsed.data.portfolioUrl || null,
      availability: parsed.data.availability ?? 'available',
      internal_rating: parsed.data.internalRating ?? null,
      internal_notes: parsed.data.internalNotes ?? null,
      last_active_at: new Date().toISOString(),
    })
    .eq('id', freelancerId)
    .eq('tenant_id', tenant.id)

  if (error) {
    if (error.code === '23505') {
      return { ok: false as const, error: 'A freelancer with this email already exists.' }
    }
    return { ok: false as const, error: error.message }
  }

  revalidatePath('/talent')
  revalidatePath(`/talent/${freelancerId}`)
  return { ok: true as const }
}

export async function updateOwnFreelancerProfile(input: FreelancerSelfProfileInput) {
  const { tenant, user } = await requireTenant()
  const supabase = await createClient()

  const parsed = freelancerSelfProfileSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const { data: freelancer } = await supabase
    .from('freelancers')
    .select('id')
    .eq('user_id', user.id)
    .eq('tenant_id', tenant?.id ?? '')
    .maybeSingle()

  if (!freelancer) {
    return { ok: false as const, error: 'No freelancer profile linked to your account.' }
  }

  const { error } = await supabase
    .from('freelancers')
    .update({
      bio: parsed.data.bio ?? null,
      portfolio_url: parsed.data.portfolioUrl || null,
      skills: parsed.data.skills,
      tags: parsed.data.tags ?? [],
      availability: parsed.data.availability,
      last_active_at: new Date().toISOString(),
    })
    .eq('id', freelancer.id)

  if (error) {
    return { ok: false as const, error: error.message }
  }

  revalidatePath('/profile')
  revalidatePath(`/talent/${freelancer.id}`)
  return { ok: true as const, freelancerId: freelancer.id as string }
}

export async function deleteFreelancer(freelancerId: string) {
  const { tenant } = await requireManager()
  requirePermission(tenant.role, 'freelancers:delete')

  const supabase = await createClient()
  const { error } = await supabase
    .from('freelancers')
    .delete()
    .eq('id', freelancerId)
    .eq('tenant_id', tenant.id)

  if (error) {
    return { ok: false as const, error: error.message }
  }

  revalidatePath('/talent')
  return { ok: true as const }
}

export async function getOwnFreelancerId(): Promise<string | null> {
  const session = await requireTenant()
  if (!session.tenant) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('freelancers')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('tenant_id', session.tenant.id)
    .maybeSingle()

  return data?.id ?? null
}
