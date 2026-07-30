'use server'

import { revalidatePath } from 'next/cache'
import { requireManager } from '@/modules/core/services/guards'
import { requirePermission } from '@/modules/core/services/permissions'
import { getOrCreateShortlist } from '@/lib/shortlists/queries'
import { createRepositories } from '@/lib/repositories/factory'

function revalidateOpportunity(opportunityId: string) {
  revalidatePath(`/opportunities/${opportunityId}`)
  revalidatePath(`/opportunities/${opportunityId}/shortlist`)
}

export async function addToShortlist(opportunityId: string, freelancerIds: string[]) {
  const { tenant, user } = await requireManager()
  requirePermission(tenant.role, 'shortlists:manage')

  if (!freelancerIds.length) {
    return { ok: false as const, error: 'Select at least one freelancer' }
  }

  const repos = await createRepositories()
  const exists = await repos.lead.existsInTenant(opportunityId, tenant.id)
  if (!exists) {
    return { ok: false as const, error: 'Opportunity not found' }
  }

  const shortlistId = await getOrCreateShortlist(opportunityId, tenant.id, user.id)
  const maxRank = await repos.shortlist.findMaxRank(shortlistId)
  let nextRank = maxRank + 1

  const rows = freelancerIds.map((freelancerId) => ({
    shortlist_id: shortlistId,
    freelancer_id: freelancerId,
    tenant_id: tenant.id,
    rank: nextRank++,
    status: 'active' as const,
  }))

  try {
    await repos.shortlist.upsertItems(rows)
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Add failed' }
  }

  revalidateOpportunity(opportunityId)
  return { ok: true as const, shortlistId }
}

export async function updateShortlistItem(
  itemId: string,
  opportunityId: string,
  input: { rank?: number; notes?: string }
) {
  const { tenant } = await requireManager()
  requirePermission(tenant.role, 'shortlists:manage')

  const repos = await createRepositories()
  const patch: Record<string, unknown> = {}
  if (input.rank !== undefined) patch.rank = input.rank
  if (input.notes !== undefined) patch.notes = input.notes || null

  try {
    await repos.shortlist.updateItem(itemId, tenant.id, patch)
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Update failed' }
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

  if (!reason.trim()) {
    return { ok: false as const, error: 'Rejection reason is required' }
  }

  const repos = await createRepositories()
  try {
    await repos.shortlist.rejectItem(itemId, tenant.id, reason)
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Reject failed' }
  }

  revalidateOpportunity(opportunityId)
  return { ok: true as const }
}

export async function addRespondentsToShortlist(opportunityId: string) {
  const { tenant } = await requireManager()
  requirePermission(tenant.role, 'shortlists:manage')

  const repos = await createRepositories()
  const freelancerIds = await repos.lead.listInterestedFreelancerIds(opportunityId)

  if (!freelancerIds.length) {
    return { ok: false as const, error: 'No interested responses to add' }
  }

  return addToShortlist(opportunityId, freelancerIds)
}
