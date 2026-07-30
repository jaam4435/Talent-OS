import type { RepositoryContext } from '@/lib/core/context'
import type { RatingHistoryEntry } from '@/lib/domains/talent/types'

export class RatingRepository {
  constructor(private readonly ctx: RepositoryContext) {}

  async findHistoryByFreelancerId(freelancerId: string): Promise<RatingHistoryEntry[]> {
    const { data } = await this.ctx.supabase
      .from('freelancer_rating_history')
      .select('id, rating, note, created_at, rated_by')
      .eq('freelancer_id', freelancerId)
      .order('created_at', { ascending: false })
      .limit(20)

    const raterIds = [...new Set((data ?? []).map((entry) => entry.rated_by))]
    const { data: profiles } = raterIds.length
      ? await this.ctx.supabase.from('profiles').select('id, full_name').in('id', raterIds)
      : { data: [] }

    const profileMap = new Map(profiles?.map((profile) => [profile.id, profile.full_name]) ?? [])

    return (data ?? []).map((entry) => ({
      id: entry.id,
      rating: Number(entry.rating),
      note: entry.note,
      createdAt: entry.created_at,
      ratedByName: profileMap.get(entry.rated_by) ?? null,
    }))
  }
}
