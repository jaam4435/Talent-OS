import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'

export interface ShortlistItemView {
  id: string
  freelancerId: string
  rank: number
  notes: string | null
  status: string
  rejectionReason: string | null
  freelancer: {
    id: string
    full_name: string
    email: string
    discipline: string
    day_rate: number | null
    currency: string
    availability: string
    internal_rating: number | null
  }
  matchScore: number | null
  response: string | null
}

export async function getOrCreateShortlist(
  opportunityId: string,
  tenantId: string,
  createdBy: string
): Promise<string> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('shortlists')
    .select('id')
    .eq('opportunity_id', opportunityId)
    .maybeSingle()

  if (existing) return existing.id

  const { data, error } = await supabase
    .from('shortlists')
    .insert({
      tenant_id: tenantId,
      opportunity_id: opportunityId,
      created_by: createdBy,
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id as string
}

export async function getShortlistItems(
  opportunityId: string,
  tenantId: string
): Promise<{ shortlistId: string | null; items: ShortlistItemView[] }> {
  const supabase = await createClient()

  const { data: shortlist } = await supabase
    .from('shortlists')
    .select('id')
    .eq('opportunity_id', opportunityId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!shortlist) {
    return { shortlistId: null, items: [] }
  }

  const { data: items } = await supabase
    .from('shortlist_items')
    .select('id, freelancer_id, rank, notes, status, rejection_reason')
    .eq('shortlist_id', shortlist.id)
    .neq('status', 'rejected')
    .order('rank')
    .order('created_at')

  const freelancerIds = (items ?? []).map((i) => i.freelancer_id)

  const { data: freelancers } = freelancerIds.length
    ? await supabase
        .from('freelancers')
        .select('id, full_name, email, discipline, day_rate, currency, availability, internal_rating')
        .in('id', freelancerIds)
    : { data: [] }

  const { data: scores } = await supabase
    .from('talent_match_scores')
    .select('freelancer_id, score')
    .eq('opportunity_id', opportunityId)

  const { data: recipients } = await supabase
    .from('opportunity_recipients')
    .select('freelancer_id, response')
    .eq('opportunity_id', opportunityId)

  const freelancerMap = new Map((freelancers ?? []).map((f) => [f.id, f]))
  const scoreMap = new Map((scores ?? []).map((s) => [s.freelancer_id, Number(s.score)]))
  const responseMap = new Map((recipients ?? []).map((r) => [r.freelancer_id, r.response]))

  const views: ShortlistItemView[] = (items ?? [])
    .map((item) => {
      const freelancer = freelancerMap.get(item.freelancer_id)
      if (!freelancer) return null

      return {
        id: item.id,
        freelancerId: item.freelancer_id,
        rank: item.rank,
        notes: item.notes,
        status: item.status,
        rejectionReason: item.rejection_reason,
        freelancer: {
          id: freelancer.id,
          full_name: freelancer.full_name,
          email: freelancer.email,
          discipline: freelancer.discipline,
          day_rate: freelancer.day_rate,
          currency: freelancer.currency,
          availability: freelancer.availability,
          internal_rating: freelancer.internal_rating,
        },
        matchScore: scoreMap.get(item.freelancer_id) ?? null,
        response: responseMap.get(item.freelancer_id) ?? null,
      }
    })
    .filter((item): item is ShortlistItemView => item !== null)

  return { shortlistId: shortlist.id, items: views }
}
