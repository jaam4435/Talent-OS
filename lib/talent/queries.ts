import type { Tables } from '@/types/database'
import { createClient } from '@/lib/supabase/server'
import type { PortfolioItem, RatingHistoryEntry } from '@/lib/talent/types'

export async function getPortfolioItems(freelancerId: string): Promise<PortfolioItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('freelancer_portfolio_items')
    .select('id, title, description, project_url, image_path, sort_order, created_at')
    .eq('freelancer_id', freelancerId)
    .order('sort_order')
    .order('created_at', { ascending: false })

  return (data ?? []).map((item) => {
    const imageUrl = item.image_path
      ? supabase.storage.from('portfolio').getPublicUrl(item.image_path).data.publicUrl
      : null

    return {
      id: item.id,
      title: item.title,
      description: item.description,
      projectUrl: item.project_url,
      imagePath: item.image_path,
      imageUrl,
      sortOrder: item.sort_order,
      createdAt: item.created_at,
    }
  })
}

export async function getRatingHistory(freelancerId: string): Promise<RatingHistoryEntry[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('freelancer_rating_history')
    .select('id, rating, note, created_at, rated_by')
    .eq('freelancer_id', freelancerId)
    .order('created_at', { ascending: false })
    .limit(20)

  const raterIds = [...new Set((data ?? []).map((r) => r.rated_by))]
  const { data: profiles } = raterIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', raterIds)
    : { data: [] }

  const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) ?? [])

  return (data ?? []).map((entry) => ({
    id: entry.id,
    rating: Number(entry.rating),
    note: entry.note,
    createdAt: entry.created_at,
    ratedByName: profileMap.get(entry.rated_by) ?? null,
  }))
}

export async function searchTalentRoster(
  tenantId: string,
  params: {
    query?: string
    discipline?: string
    availability?: string
    minRate?: number
    maxRate?: number
    minRating?: number
    sort?: string
    limit?: number
    offset?: number
  }
) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('search_freelancers', {
    p_tenant_id: tenantId,
    p_query: params.query ?? null,
    p_discipline: params.discipline ?? null,
    p_availability: params.availability ?? null,
    p_min_rate: params.minRate ?? null,
    p_max_rate: params.maxRate ?? null,
    p_min_rating: params.minRating ?? null,
    p_sort: params.sort ?? 'rating',
    p_limit: params.limit ?? 20,
    p_offset: params.offset ?? 0,
  })

  if (error) throw error
  return (data ?? []) as Tables<'freelancers'>[]
}
