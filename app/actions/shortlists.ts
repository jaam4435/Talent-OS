'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/auth/guards'
import { requirePermission } from '@/lib/auth/permissions'
import { getOrCreateShortlist } from '@/lib/shortlists/queries'

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

  const supabase = await createClient()

  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('id')
    .eq('id', opportunityId)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  if (!opportunity) {
    return { ok: false as const, error: 'Opportunity not found' }
  }

  const shortlistId = await getOrCreateShortlist(opportunityId, tenant.id, user.id)

  const { data: existingItems } = await supabase
    .from('shortlist_items')
    .select('rank')
    .eq('shortlist_id', shortlistId)
    .order('rank', { ascending: false })
    .limit(1)

  let nextRank = (existingItems?.[0]?.rank ?? 0) + 1

  const rows = freelancerIds.map((freelancerId) => ({
    shortlist_id: shortlistId,
    freelancer_id: freelancerId,
    tenant_id: tenant.id,
    rank: nextRank++,
    status: 'active' as const,
  }))

  const { error } = await supabase.from('shortlist_items').upsert(rows, {
    onConflict: 'shortlist_id,freelancer_id',
    ignoreDuplicates: true,
  })

  if (error) {
    return { ok: false as const, error: error.message }
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

  const supabase = await createClient()
  const patch: Record<string, unknown> = {}

  if (input.rank !== undefined) patch.rank = input.rank
  if (input.notes !== undefined) patch.notes = input.notes || null

  const { error } = await supabase
    .from('shortlist_items')
    .update(patch)
    .eq('id', itemId)
    .eq('tenant_id', tenant.id)

  if (error) {
    return { ok: false as const, error: error.message }
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

  const supabase = await createClient()

  const { error } = await supabase
    .from('shortlist_items')
    .update({
      status: 'rejected',
      rejection_reason: reason.trim(),
    })
    .eq('id', itemId)
    .eq('tenant_id', tenant.id)

  if (error) {
    return { ok: false as const, error: error.message }
  }

  revalidateOpportunity(opportunityId)
  return { ok: true as const }
}

export async function addRespondentsToShortlist(opportunityId: string) {
  const { tenant, user } = await requireManager()
  requirePermission(tenant.role, 'shortlists:manage')

  const supabase = await createClient()

  const { data: recipients } = await supabase
    .from('opportunity_recipients')
    .select('freelancer_id')
    .eq('opportunity_id', opportunityId)
    .eq('response', 'interested')

  const freelancerIds = recipients?.map((r) => r.freelancer_id) ?? []
  if (!freelancerIds.length) {
    return { ok: false as const, error: 'No interested responses to add' }
  }

  return addToShortlist(opportunityId, freelancerIds)
}
