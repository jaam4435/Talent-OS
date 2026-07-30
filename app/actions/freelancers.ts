'use server'

import { revalidatePath } from 'next/cache'
import { requireManager } from '@/modules/core/services/guards'
import { requireTenant } from '@/modules/core/services/session'
import { requirePermission } from '@/modules/core/services/permissions'
import { createTalentServices } from '@/lib/domains/talent/factory'
import type { FreelancerProfileInput, FreelancerSelfProfileInput } from '@/lib/talent/types'

export async function createFreelancer(input: FreelancerProfileInput) {
  const { tenant } = await requireManager()
  requirePermission(tenant.role, 'freelancers:create')

  const { talent } = await createTalentServices()
  const result = await talent.createFreelancer(tenant, input)

  if (!result.ok) {
    return result
  }

  revalidatePath('/talent')
  return result
}

export async function updateFreelancer(freelancerId: string, input: FreelancerProfileInput) {
  const { tenant } = await requireManager()
  requirePermission(tenant.role, 'freelancers:update')

  const { talent } = await createTalentServices()
  const result = await talent.updateFreelancer(freelancerId, tenant, input)

  if (!result.ok) {
    return result
  }

  revalidatePath('/talent')
  revalidatePath(`/talent/${freelancerId}`)
  return result
}

export async function updateOwnFreelancerProfile(input: FreelancerSelfProfileInput) {
  const { tenant, user } = await requireTenant()

  const { talent } = await createTalentServices()
  const result = await talent.updateOwnProfile(user.id, tenant, input)

  if (!result.ok) {
    return result
  }

  revalidatePath('/profile')
  revalidatePath(`/talent/${result.freelancerId}`)
  return result
}

export async function deleteFreelancer(freelancerId: string) {
  const { tenant } = await requireManager()
  requirePermission(tenant.role, 'freelancers:delete')

  const { talent } = await createTalentServices()
  const result = await talent.deleteFreelancer(freelancerId, tenant.id)

  if (!result.ok) {
    return result
  }

  revalidatePath('/talent')
  return result
}

export async function getOwnFreelancerId(): Promise<string | null> {
  const session = await requireTenant()
  if (!session.tenant) return null

  const { talent } = await createTalentServices()
  return talent.getOwnFreelancerId(session.user.id, session.tenant.id)
}
