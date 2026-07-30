import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type {
  AggregatedRating,
  MarketplaceRating,
  MarketplaceRatingRow,
  MarketplaceVisibility,
  RatingSource,
} from '@/modules/marketplace/types'

function mapRating(row: MarketplaceRatingRow): MarketplaceRating {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    freelancerId: row.freelancer_id,
    source: row.source,
    rating: Number(row.rating),
    reviewerType: row.reviewer_type,
    reviewerId: row.reviewer_id,
    projectId: row.project_id,
    visibility: row.visibility,
    reviewText: row.review_text,
    createdAt: row.created_at,
  }
}

export class MarketplaceRatingRepository extends BaseRepository {
  async create(
    tenantId: string,
    reviewerId: string | null,
    input: {
      freelancerId: string
      source: RatingSource
      rating: number
      reviewerType: string
      projectId?: string | null
      visibility?: MarketplaceVisibility
      reviewText?: string | null
    }
  ): Promise<string> {
    const { data, error } = await this.ctx.supabase
      .from('marketplace_ratings')
      .insert({
        tenant_id: tenantId,
        freelancer_id: input.freelancerId,
        source: input.source,
        rating: input.rating,
        reviewer_type: input.reviewerType,
        reviewer_id: reviewerId,
        project_id: input.projectId ?? null,
        visibility: input.visibility ?? 'tenant',
        review_text: input.reviewText ?? null,
      })
      .select('id')
      .single()

    this.throwIfError(error)
    if (!data?.id) this.notFound('Marketplace rating')
    return data.id
  }

  async listByFreelancer(
    tenantId: string,
    freelancerId: string,
    options?: { source?: RatingSource; visibility?: MarketplaceVisibility }
  ): Promise<MarketplaceRating[]> {
    let query = this.ctx.supabase
      .from('marketplace_ratings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('freelancer_id', freelancerId)
      .order('created_at', { ascending: false })

    if (options?.source) query = query.eq('source', options.source)
    if (options?.visibility) query = query.eq('visibility', options.visibility)

    const { data, error } = await query
    this.throwIfError(error)
    return (data ?? []).map((row) => mapRating(row as MarketplaceRatingRow))
  }

  async aggregate(
    tenantId: string,
    freelancerId: string,
    visibility?: MarketplaceVisibility
  ): Promise<AggregatedRating> {
    const ratings = await this.listByFreelancer(tenantId, freelancerId, { visibility })
    if (!ratings.length) {
      return { average: 0, count: 0, bySource: {} }
    }

    const sum = ratings.reduce((acc, r) => acc + r.rating, 0)
    const bySource: AggregatedRating['bySource'] = {}

    for (const rating of ratings) {
      const bucket = bySource[rating.source] ?? { average: 0, count: 0 }
      bucket.count += 1
      bucket.average += rating.rating
      bySource[rating.source] = bucket
    }

    for (const source of Object.keys(bySource) as RatingSource[]) {
      const bucket = bySource[source]!
      bucket.average = bucket.count ? bucket.average / bucket.count : 0
    }

    return {
      average: sum / ratings.length,
      count: ratings.length,
      bySource,
    }
  }
}
