'use server'

import { revalidatePath } from 'next/cache'
import { requireManager } from '@/modules/core/services/guards'
import { requirePermission } from '@/modules/core/services/permissions'
import { createServices } from '@/lib/services/factory'

function revalidateOpportunity(opportunityId: string) {
  revalidatePath(`/opportunities/${opportunityId}`)
  revalidatePath(`/opportunities/${opportunityId}/shortlist`)
}

export async function addToShortlist(opportunityId: string, freelancerIds: string[]) {
  const { tenant, user } = await requireManager()
  requirePermission(tenant.role, 'shortlists:manage')

  const services = await createServices()
  const result = await services.assignment.addToShortlist(
    opportunityId,
    tenant.id,
    user.id,
    freelancerIds
  )

  if (!result.ok) {
    return { ok: false as const, error: result.error }
  }

  revalidateOpportunity(opportunityId)
  return { ok: true as const, shortlistId: result.shortlistId }
}

export async function updateShortlistItem(
  itemId: string,
  opportunityId: string,
  input: { rank?: number; notes?: string }
) {
  const { tenant } = await requireManager()
  requirePermission(tenant.role, 'shortlists:manage')

  const services = await createServices()
  const result = await services.assignment.updateShortlistItem(itemId, tenant.id, input)

  if (!result.ok) {
    return { ok: false as const, error: result.error }
  }

  revalidateOpportunity(opportunityId)
  return { ok: true as const }
}

export async function rejectShortlistCandidate(
  itemId: string,
  opportunityId: string,
  reason: string
) {
  const { tenant } = await requireManager()
  requirePermission(tenant.role, 'shortlists:manage')

  const services = await createServices()
  const result = await services.assignment.rejectShortlistCandidate(itemId, tenant.id, reason)

  if (!result.ok) {
    return { ok: false as const, error: result.error }
  }

  revalidateOpportunity(opportunityId)
  return { ok: true as const }
}

export async function addRespondentsToShortlist(opportunityId: string) {
  const { tenant, user } = await requireManager()
  requirePermission(tenant.role, 'shortlists:manage')

  const services = await createServices()
  const result = await services.assignment.addRespondentsToShortlist(
    opportunityId,
    tenant.id,
    user.id
  )

  if (!result.ok) {
    return { ok: false as const, error: result.error }
  }

  revalidateOpportunity(opportunityId)
  return { ok: true as const, shortlistId: result.shortlistId }
}
