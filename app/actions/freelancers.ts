'use server'

import { revalidatePath } from 'next/cache'
import { requireManager } from '@/modules/core/services/guards'
import { requireTenant } from '@/modules/core/services/session'
import { requirePermission } from '@/modules/core/services/permissions'
import { createServices } from '@/lib/services/factory'
import type { FreelancerProfileInput, FreelancerSelfProfileInput } from '@/lib/talent/types'

export async function createFreelancer(input: FreelancerProfileInput) {
  const { tenant } = await requireManager()
  requirePermission(tenant.role, 'freelancers:create')

  const services = await createServices()
  const result = await services.talent.createFreelancer(tenant, input)

  if (!result.ok) {
    return result
  }

  revalidatePath('/talent')
  return result
}

export async function updateFreelancer(freelancerId: string, input: FreelancerProfileInput) {
  const { tenant } = await requireManager()
  requirePermission(tenant.role, 'freelancers:update')

  const services = await createServices()
  const result = await services.talent.updateFreelancer(freelancerId, tenant, input)

  if (!result.ok) {
    return result
  }

  revalidatePath('/talent')
  revalidatePath(`/talent/${freelancerId}`)
  return result
}

export async function updateOwnFreelancerProfile(input: FreelancerSelfProfileInput) {
  const { tenant, user } = await requireTenant()

  const services = await createServices()
  const result = await services.talent.updateOwnProfile(user.id, tenant, input)

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

  const services = await createServices()
  const result = await services.talent.deleteFreelancer(freelancerId, tenant.id)

  if (!result.ok) {
    return result
  }

  revalidatePath('/talent')
  return result
}

export async function getOwnFreelancerId(): Promise<string | null> {
  const session = await requireTenant()
  if (!session.tenant) return null

  const services = await createServices()
  return services.talent.getOwnFreelancerId(session.user.id, session.tenant.id)
}
