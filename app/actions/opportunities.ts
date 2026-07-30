'use server'

import { revalidatePath } from 'next/cache'
import { requireManager } from '@/modules/core/services/guards'
import { requirePermission } from '@/modules/core/services/permissions'
import { requireTenant } from '@/modules/core/services/session'
import {
  broadcastOpportunitySchema,
  createOpportunitySchema,
  opportunityResponseSchema,
} from '@/lib/opportunities/validation'
import type {
  BroadcastOpportunityInput,
  CreateOpportunityInput,
  OpportunityResponseInput,
} from '@/lib/opportunities/types'
import { createServices } from '@/lib/services/factory'

export async function createOpportunity(input: CreateOpportunityInput) {
  const { tenant, user } = await requireManager()
  requirePermission(tenant.role, 'opportunities:create')

  const parsed = createOpportunitySchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const services = await createServices()
  const result = await services.crm.createOpportunity(tenant.id, user.id, tenant.currency, parsed.data)

  if (!result.ok) {
    return { ok: false as const, error: result.error }
  }

  revalidatePath('/opportunities')
  return { ok: true as const, opportunityId: result.opportunityId }
}

export async function broadcastOpportunity(input: BroadcastOpportunityInput) {
  const { tenant, user } = await requireManager()
  requirePermission(tenant.role, 'opportunities:broadcast')

  const parsed = broadcastOpportunitySchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const services = await createServices()
  const result = await services.assignment.broadcastOpportunity(
    tenant.id,
    user.id,
    tenant.name,
    tenant.slug,
    parsed.data
  )

  if (!result.ok) {
    return { ok: false as const, error: result.error }
  }

  revalidatePath('/opportunities')
  revalidatePath(`/opportunities/${parsed.data.opportunityId}`)
  revalidatePath(`/opportunities/${parsed.data.opportunityId}/shortlist`)

  return { ok: true as const, recipientCount: result.recipientCount }
}

export async function respondToOpportunity(input: OpportunityResponseInput) {
  const { tenant, user } = await requireTenant()
  requirePermission(tenant.role, 'opportunities:respond')

  const parsed = opportunityResponseSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const services = await createServices()
  const freelancerId = await services.talent.getOwnFreelancerId(user.id, tenant.id)

  if (!freelancerId) {
    return { ok: false as const, error: 'No freelancer profile linked to your account' }
  }

  const result = await services.crm.respondToOpportunity(tenant.id, user.id, freelancerId, parsed.data)

  if (!result.ok) {
    return { ok: false as const, error: result.error }
  }

  revalidatePath(`/opportunities/${parsed.data.opportunityId}`)
  revalidatePath(`/opportunities/${parsed.data.opportunityId}/shortlist`)

  return { ok: true as const }
}
